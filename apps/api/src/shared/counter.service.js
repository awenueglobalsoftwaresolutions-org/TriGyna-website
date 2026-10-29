const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 1000 },
  },
  { timestamps: true }
);

const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

/**
 * Atomically increments and retrieves the next sequence number for an entity.
 * Uses atomic MongoDB findOneAndUpdate with $inc to guarantee zero collision under concurrency.
 */
async function getNextSequence(sequenceName, initialFloor = 1000, session = null, retries = 10) {
  const options = {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  };
  if (session) {
    options.session = session;
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await Counter.findOneAndUpdate(
        { _id: sequenceName },
        { $inc: { seq: 1 } },
        options
      );

      if (result.seq < initialFloor) {
        const updated = await Counter.findOneAndUpdate(
          { _id: sequenceName, seq: { $lt: initialFloor } },
          { $set: { seq: initialFloor } },
          options
        );
        return updated ? updated.seq : result.seq;
      }

      return result.seq;
    } catch (err) {
      if ((err.code === 11000 || err.codeName === "DuplicateKey") && attempt < retries - 1) {
        // Backoff slightly and retry
        await new Promise((resolve) => setTimeout(resolve, 5 + Math.random() * 20));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Generate atomic collision-safe appointment code: TG-A-<seq>
 */
async function generateAtomicAppointmentCode(session = null) {
  const seq = await getNextSequence("appointment_code", 1100, session);
  return `TG-A-${seq}`;
}

/**
 * Generate atomic collision-safe patient code: TG-P-<seq>
 */
async function generateAtomicPatientCode(session = null) {
  const seq = await getNextSequence("patient_code", 1100, session);
  return `TG-P-${seq}`;
}

/**
 * Generate atomic collision-safe invoice number
 */
async function generateAtomicInvoiceNumber(prefix = "TRI", session = null) {
  const year = new Date().getFullYear();
  if (prefix === "INV") {
    const seq = await getNextSequence(`invoice_num_${year}`, 1150, session);
    return `INV-${year}-${seq}`;
  }
  const seq = await getNextSequence(`invoice_tri_${year}`, 10050, session);
  return `${prefix}/${year}/${String(seq).padStart(6, "0")}`;
}

/**
 * Generate atomic collision-safe receipt number: RCP/YYYY/XXXXXX
 */
async function generateAtomicReceiptNumber(session = null) {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`receipt_num_${year}`, 10050, session);
  return `RCP/${year}/${String(seq).padStart(6, "0")}`;
}

/**
 * Generate atomic collision-safe follow-up code: TG-FU-<seq>
 */
async function generateAtomicFollowUpCode(session = null) {
  const seq = await getNextSequence("followup_code", 1000, session);
  return `TG-FU-${seq}`;
}

/**
 * Generate atomic collision-safe prescription code: TG-RX-<seq>
 */
async function generateAtomicPrescriptionCode(session = null) {
  const seq = await getNextSequence("prescription_code", 1100, session);
  return `TG-RX-${seq}`;
}

module.exports = {
  Counter,
  getNextSequence,
  generateAtomicAppointmentCode,
  generateAtomicPatientCode,
  generateAtomicInvoiceNumber,
  generateAtomicReceiptNumber,
  generateAtomicFollowUpCode,
  generateAtomicPrescriptionCode,
};
