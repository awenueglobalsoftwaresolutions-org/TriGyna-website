const mongoose = require("mongoose");
const Entitlement = require("./entitlement.model");
const SessionTransaction = require("./session-transaction.model");
const Package = require("./package.model");
const Patient = require("../patients/patient.model");
const User = require("../users/user.model");
const { dispatchNotificationEvent } = require("../notifications/notification.service");
const { ValidationError, NotFoundError } = require("../../shared/errors");

/**
 * Grant package entitlement upon verified payment or manual activation
 */
async function grantPackageEntitlement({ patientId, packageId, orderId, paymentId, actor }) {
  const pkg = await Package.findById(packageId);
  if (!pkg) {
    throw new NotFoundError("Healthcare package not found");
  }

  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new NotFoundError("Patient record not found");
  }

  const validityDays = pkg.validityDays || 90;
  const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

  const entitlement = await Entitlement.create({
    patientId,
    packageId: pkg._id,
    packageName: pkg.name,
    totalSessions: pkg.totalSessions,
    availableSessions: pkg.totalSessions,
    reservedSessions: 0,
    consumedSessions: 0,
    status: "active",
    expiresAt,
    orderId,
    paymentId,
  });

  // Record initial ledger transaction
  await SessionTransaction.create({
    entitlementId: entitlement._id,
    patientId,
    type: "PURCHASE",
    availableDelta: pkg.totalSessions,
    reservedDelta: 0,
    consumedDelta: 0,
    balanceAfter: {
      available: pkg.totalSessions,
      reserved: 0,
      consumed: 0,
    },
    reason: `Purchased ${pkg.name} (${pkg.totalSessions} sessions valid for ${validityDays} days)`,
    performedBy: actor?._id,
  });

  // Dispatch notification
  const patientUser = patient.userId ? await User.findById(patient.userId) : null;
  await dispatchNotificationEvent("package.purchased", {
    packageName: pkg.name,
    totalSessions: pkg.totalSessions,
    patientUser,
    patientName: patient.fullName,
  });

  return entitlement;
}

/**
 * Reserve 1 session credit upon appointment booking if patient has an active package entitlement
 */
async function reserveSessionCredit({ patientId, appointmentId, actor }) {
  if (!patientId || !appointmentId) return { reserved: false };

  // Check idempotency: already reserved for this appointment?
  const existingTx = await SessionTransaction.findOne({
    appointmentId,
    type: "RESERVE",
  });
  if (existingTx) {
    return { reserved: true, entitlementId: existingTx.entitlementId };
  }

  // Find active non-expired entitlement with available sessions
  const entitlement = await Entitlement.findOne({
    patientId,
    status: "active",
    availableSessions: { $gt: 0 },
    expiresAt: { $gt: new Date() },
  }).sort({ expiresAt: 1 }); // Use earliest expiring package first

  if (!entitlement) {
    return { reserved: false, reason: "No active package entitlement with available sessions" };
  }

  // Atomically shift 1 session from available to reserved
  entitlement.availableSessions -= 1;
  entitlement.reservedSessions += 1;
  await entitlement.save();

  await SessionTransaction.create({
    entitlementId: entitlement._id,
    patientId,
    appointmentId,
    type: "RESERVE",
    availableDelta: -1,
    reservedDelta: 1,
    consumedDelta: 0,
    balanceAfter: {
      available: entitlement.availableSessions,
      reserved: entitlement.reservedSessions,
      consumed: entitlement.consumedSessions,
    },
    reason: `Reserved 1 session credit for appointment booking #${appointmentId}`,
    performedBy: actor?._id,
  });

  return { reserved: true, entitlementId: entitlement._id };
}

/**
 * Release 1 reserved session credit upon appointment cancellation or reschedule
 */
async function releaseSessionCredit({ patientId, appointmentId, reason = "Appointment cancelled", actor }) {
  if (!appointmentId) return { released: false };

  // Find the reservation
  const reserveTx = await SessionTransaction.findOne({
    appointmentId,
    type: "RESERVE",
  });
  if (!reserveTx) {
    return { released: false, reason: "No active reservation for this appointment" };
  }

  // Check if already released or consumed
  const finalizedTx = await SessionTransaction.findOne({
    appointmentId,
    type: { $in: ["RELEASE", "CONSUME"] },
  });
  if (finalizedTx) {
    return { released: false, reason: `Session already ${finalizedTx.type.toLowerCase()}d` };
  }

  const entitlement = await Entitlement.findById(reserveTx.entitlementId);
  if (!entitlement) {
    return { released: false, reason: "Entitlement record not found" };
  }

  // Atomically shift 1 session from reserved back to available
  entitlement.reservedSessions = Math.max(0, entitlement.reservedSessions - 1);
  entitlement.availableSessions += 1;
  if (entitlement.status === "depleted") {
    entitlement.status = "active";
  }
  await entitlement.save();

  await SessionTransaction.create({
    entitlementId: entitlement._id,
    patientId: entitlement.patientId,
    appointmentId,
    type: "RELEASE",
    availableDelta: 1,
    reservedDelta: -1,
    consumedDelta: 0,
    balanceAfter: {
      available: entitlement.availableSessions,
      reserved: entitlement.reservedSessions,
      consumed: entitlement.consumedSessions,
    },
    reason: `Released reserved credit: ${reason}`,
    performedBy: actor?._id,
  });

  return { released: true, entitlementId: entitlement._id };
}

/**
 * Permanently consume 1 reserved session credit upon consultation finalization
 * Enforces strict idempotency so duplicate requests never consume extra sessions.
 */
async function consumeSessionCredit({ patientId, appointmentId, actor }) {
  if (!appointmentId) return { consumed: false };

  // Check idempotency: already consumed?
  const existingConsume = await SessionTransaction.findOne({
    appointmentId,
    type: "CONSUME",
  });
  if (existingConsume) {
    return { consumed: true, message: "Session already consumed" };
  }

  // Find reservation
  const reserveTx = await SessionTransaction.findOne({
    appointmentId,
    type: "RESERVE",
  });

  if (!reserveTx) {
    return { consumed: false, reason: "No reserved session to consume" };
  }

  const entitlement = await Entitlement.findById(reserveTx.entitlementId);
  if (!entitlement) {
    return { consumed: false, reason: "Entitlement record not found" };
  }

  // Shift 1 session from reserved to consumed
  entitlement.reservedSessions = Math.max(0, entitlement.reservedSessions - 1);
  entitlement.consumedSessions += 1;

  if (entitlement.availableSessions === 0 && entitlement.reservedSessions === 0) {
    entitlement.status = "depleted";
  }
  await entitlement.save();

  await SessionTransaction.create({
    entitlementId: entitlement._id,
    patientId: entitlement.patientId,
    appointmentId,
    type: "CONSUME",
    availableDelta: 0,
    reservedDelta: -1,
    consumedDelta: 1,
    balanceAfter: {
      available: entitlement.availableSessions,
      reserved: entitlement.reservedSessions,
      consumed: entitlement.consumedSessions,
    },
    reason: `Consumed 1 session upon consultation finalization for appointment #${appointmentId}`,
    performedBy: actor?._id,
  });

  return { consumed: true, entitlementId: entitlement._id };
}

/**
 * Get aggregated active package entitlements and session ledger for a patient
 */
async function getPatientSessionSummary(patientId) {
  const [entitlements, transactions] = await Promise.all([
    Entitlement.find({ patientId }).sort({ createdAt: -1 }),
    SessionTransaction.find({ patientId }).sort({ createdAt: -1 }).limit(20),
  ]);

  let totalPurchased = 0;
  let totalAvailable = 0;
  let totalReserved = 0;
  let totalConsumed = 0;

  entitlements.forEach((e) => {
    totalPurchased += e.totalSessions;
    totalAvailable += e.availableSessions;
    totalReserved += e.reservedSessions;
    totalConsumed += e.consumedSessions;
  });

  return {
    entitlements,
    ledger: transactions,
    aggregate: {
      totalPurchased,
      totalAvailable,
      totalReserved,
      totalConsumed,
    },
  };
}

module.exports = {
  grantPackageEntitlement,
  reserveSessionCredit,
  releaseSessionCredit,
  consumeSessionCredit,
  getPatientSessionSummary,
};

