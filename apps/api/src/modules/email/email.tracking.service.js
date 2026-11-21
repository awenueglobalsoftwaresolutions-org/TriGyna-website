const EmailLog = require("./email-log.model");

/**
 * Valid state hierarchy:
 * queued (0) -> sending (1) -> sent (2) -> delivery_delayed (2.5) -> delivered (3) / bounced (3) / complained (3) / failed (3)
 */
const STATUS_HIERARCHY = {
  queued: 0,
  sending: 1,
  sent: 2,
  delivery_delayed: 2,
  delivered: 3,
  bounced: 3,
  complained: 3,
  failed: 3,
};

const TERMINAL_STATUSES = new Set(["delivered", "bounced", "complained"]);

class EmailTrackingService {
  /**
   * Determine if transition is permitted
   */
  canTransition(currentStatus, newStatus) {
    if (!currentStatus) return true;
    if (currentStatus === newStatus) return true;

    // Terminal statuses can never be reverted to lower/intermediate statuses
    if (TERMINAL_STATUSES.has(currentStatus)) {
      // Once delivered, we should not transition back to sent or delayed
      if (currentStatus === "delivered" && (newStatus === "sent" || newStatus === "delivery_delayed")) {
        return false;
      }
      // Once bounced or complained, do not overwrite with sent or delivered
      if ((currentStatus === "bounced" || currentStatus === "complained") && newStatus === "sent") {
        return false;
      }
    }

    const currentRank = STATUS_HIERARCHY[currentStatus] ?? 0;
    const newRank = STATUS_HIERARCHY[newStatus] ?? 0;

    // Prevent strictly older states from downgrading newer states
    return newRank >= currentRank;
  }

  /**
   * Update status of an EmailLog by providerEmailId or internal ID
   */
  async updateStatus({ providerEmailId, emailLogId, newStatus, reason = null, eventTimestamp = new Date() }) {
    const query = providerEmailId ? { providerEmailId } : { _id: emailLogId };
    const emailLog = await EmailLog.findOne(query);

    if (!emailLog) {
      return null;
    }

    if (!this.canTransition(emailLog.status, newStatus)) {
      console.log(`[Email Tracking] Ignoring invalid status transition from '${emailLog.status}' to '${newStatus}' for message ${emailLog.providerEmailId || emailLog._id}`);
      return emailLog;
    }

    const updates = {
      status: newStatus,
      lastAttemptAt: new Date(),
    };

    if (reason) {
      updates.failureReason = reason;
    }

    if (newStatus === "sent" && !emailLog.sentAt) {
      updates.sentAt = eventTimestamp;
    } else if (newStatus === "delivered" && !emailLog.deliveredAt) {
      updates.deliveredAt = eventTimestamp;
    } else if (newStatus === "bounced" && !emailLog.bouncedAt) {
      updates.bouncedAt = eventTimestamp;
    } else if (newStatus === "complained" && !emailLog.complainedAt) {
      updates.complainedAt = eventTimestamp;
    } else if (newStatus === "failed") {
      updates.failedAt = eventTimestamp;
    }

    const updated = await EmailLog.findByIdAndUpdate(emailLog._id, { $set: updates }, { new: true });
    return updated;
  }
}

module.exports = new EmailTrackingService();
