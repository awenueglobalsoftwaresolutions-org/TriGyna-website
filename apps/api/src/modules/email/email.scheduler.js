const EmailReminder = require("./email-reminder.model");
const EmailAutomationSettings = require("./email-automation-settings.model");
const emailService = require("./email.service");
const Appointment = require("../appointments/appointment.model");
const Doctor = require("../doctors/doctor.model");
const Patient = require("../patients/patient.model");

class EmailScheduler {
  constructor() {
    this.isRunning = false;
    this.timer = null;
    this.pollIntervalMs = 60000; // 60 seconds
  }

  /**
   * Parse appointment date and time into a unified UTC Date
   */
  parseAppointmentDateTime(dateStr, timeStr) {
    if (!dateStr) return null;

    let baseDate;
    if (dateStr instanceof Date) {
      baseDate = new Date(dateStr);
    } else {
      baseDate = new Date(dateStr);
      if (isNaN(baseDate.getTime())) {
        const parts = String(dateStr).split("-").map(Number);
        if (parts.length === 3) {
          baseDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
        } else {
          return null;
        }
      }
    }

    let hours = 10;
    let minutes = 0;

    if (timeStr && typeof timeStr === "string") {
      const isPM = /pm/i.test(timeStr);
      const isAM = /am/i.test(timeStr);
      const clean = timeStr.replace(/[^0-9:]/g, "");
      const [h, m] = clean.split(":").map(Number);
      if (!isNaN(h)) {
        hours = h;
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
      }
      if (!isNaN(m)) minutes = m;
    }

    // Set time on the base date
    const finalDate = new Date(baseDate);
    finalDate.setHours(hours, minutes, 0, 0);
    return finalDate;
  }

  /**
   * Compute exact reminder and follow-up target dates
   */
  computeReminderWindows(targetDate) {
    const base = targetDate instanceof Date ? targetDate : new Date(targetDate);
    const ms = base.getTime();
    return {
      reminder_48h: new Date(ms - 48 * 60 * 60 * 1000),
      reminder_24h: new Date(ms - 24 * 60 * 60 * 1000),
      reminder_2h: new Date(ms - 2 * 60 * 60 * 1000),
      followup_1d: new Date(ms + 24 * 60 * 60 * 1000),
      followup_3d: new Date(ms + 72 * 60 * 60 * 1000),
      followup_7d: new Date(ms + 168 * 60 * 60 * 1000),
    };
  }

  /**
   * Schedule 48h, 24h, and 2h reminders for an appointment
   */
  async scheduleAppointmentReminders(appointment, customEmail = null) {
    try {
      const patientEmail =
        customEmail ||
        appointment.patientEmail ||
        (appointment.patientId?.email ? appointment.patientId.email : null);

      let targetEmail = patientEmail;
      if (!targetEmail && appointment.patientId) {
        const pat = await Patient.findById(appointment.patientId).select("email fullName");
        targetEmail = pat?.email;
      }

      if (!targetEmail) {
        console.warn(`[Email Scheduler] Cannot schedule reminder for appointment ${appointment._id}: No patient email found.`);
        return;
      }

      const apptTime = this.parseAppointmentDateTime(
        appointment.appointmentDate,
        appointment.startTime
      );

      if (!apptTime || isNaN(apptTime.getTime())) {
        console.warn(`[Email Scheduler] Invalid appointment date/time for appointment ${appointment._id}`);
        return;
      }

      const now = Date.now();
      const remindersToSchedule = [
        {
          type: "48h",
          settingKey: "appointment_reminder_48h",
          targetTime: new Date(apptTime.getTime() - 48 * 60 * 60 * 1000),
        },
        {
          type: "24h",
          settingKey: "appointment_reminder_24h",
          targetTime: new Date(apptTime.getTime() - 24 * 60 * 60 * 1000),
        },
        {
          type: "2h",
          settingKey: "appointment_reminder_2h",
          targetTime: new Date(apptTime.getTime() - 2 * 60 * 60 * 1000),
        },
      ];

      for (const item of remindersToSchedule) {
        // Only schedule if target time is still in the future
        if (item.targetTime.getTime() > now) {
          await EmailReminder.findOneAndUpdate(
            {
              appointmentId: appointment._id,
              reminderType: item.type,
            },
            {
              $set: {
                patientId: appointment.patientId?._id || appointment.patientId,
                doctorId: appointment.doctorId?._id || appointment.doctorId,
                recipientEmail: targetEmail.trim().toLowerCase(),
                targetTime: item.targetTime,
                status: "scheduled",
              },
            },
            { upsert: true, new: true }
          );
        }
      }
      console.log(`[Email Scheduler] Reminders configured for appointment ${appointment.appointmentCode || appointment._id} (${targetEmail})`);
    } catch (err) {
      console.error("[Email Scheduler] Error scheduling appointment reminders:", err.message);
    }
  }

  /**
   * Reschedule reminders when appointment date/time changes
   */
  async rescheduleAppointmentReminders(appointment, customEmail = null) {
    try {
      // Cancel obsolete scheduled reminders
      await EmailReminder.updateMany(
        {
          appointmentId: appointment._id,
          status: "scheduled",
        },
        {
          $set: { status: "cancelled", failureReason: "Appointment rescheduled" },
        }
      );

      // Re-schedule with new timing
      await this.scheduleAppointmentReminders(appointment, customEmail);
    } catch (err) {
      console.error("[Email Scheduler] Error rescheduling appointment reminders:", err.message);
    }
  }

  /**
   * Cancel reminders when appointment is cancelled or rejected
   */
  async cancelAppointmentReminders(appointmentId, reason = "Appointment cancelled") {
    try {
      await EmailReminder.updateMany(
        {
          appointmentId,
          status: "scheduled",
        },
        {
          $set: { status: "cancelled", failureReason: reason },
        }
      );
      console.log(`[Email Scheduler] Cancelled all pending reminders for appointment ${appointmentId}`);
    } catch (err) {
      console.error("[Email Scheduler] Error cancelling appointment reminders:", err.message);
    }
  }

  /**
   * Schedule post-consultation follow-ups (1d, 3d, 7d)
   */
  async scheduleAppointmentFollowUps(appointment, customEmail = null) {
    try {
      let targetEmail = customEmail || appointment.patientEmail;
      if (!targetEmail && appointment.patientId) {
        const pat = await Patient.findById(appointment.patientId).select("email");
        targetEmail = pat?.email;
      }

      if (!targetEmail) return;

      const baseTime = appointment.completedAt ? new Date(appointment.completedAt).getTime() : Date.now();
      const followUps = [
        { type: "followup_1d", delayMs: 1 * 24 * 60 * 60 * 1000 },
        { type: "followup_3d", delayMs: 3 * 24 * 60 * 60 * 1000 },
        { type: "followup_7d", delayMs: 7 * 24 * 60 * 60 * 1000 },
      ];

      for (const fu of followUps) {
        await EmailReminder.findOneAndUpdate(
          {
            appointmentId: appointment._id,
            reminderType: fu.type,
          },
          {
            $set: {
              patientId: appointment.patientId?._id || appointment.patientId,
              doctorId: appointment.doctorId?._id || appointment.doctorId,
              recipientEmail: targetEmail.trim().toLowerCase(),
              targetTime: new Date(baseTime + fu.delayMs),
              status: "scheduled",
            },
          },
          { upsert: true, new: true }
        );
      }
      console.log(`[Email Scheduler] Follow-ups scheduled (1d, 3d, 7d) for appointment ${appointment.appointmentCode || appointment._id}`);
    } catch (err) {
      console.error("[Email Scheduler] Error scheduling appointment follow-ups:", err.message);
    }
  }

  /**
   * Process all reminders and follow-ups due at this moment
   */
  async processDueReminders() {
    const now = new Date();
    const dueReminders = await EmailReminder.find({
      status: "scheduled",
      targetTime: { $lte: now },
    }).limit(20);

    for (const reminder of dueReminders) {
      try {
        // Atomically claim reminder to avoid race conditions
        const claimed = await EmailReminder.findOneAndUpdate(
          { _id: reminder._id, status: "scheduled" },
          { $set: { status: "sending" } },
          { new: true }
        );

        if (!claimed) continue;

        // Fetch appointment details
        const appointment = await Appointment.findById(reminder.appointmentId)
          .populate("patientId", "fullName email phone patientCode")
          .populate({
            path: "doctorId",
            populate: { path: "userId", select: "name email phone" },
          });

        if (!appointment) {
          claimed.status = "cancelled";
          claimed.failureReason = "Appointment record not found";
          await claimed.save();
          continue;
        }

        // If appointment was cancelled or rejected, cancel reminder
        if (["cancelled", "rejected"].includes(appointment.status)) {
          claimed.status = "cancelled";
          claimed.failureReason = `Appointment status is '${appointment.status}'`;
          await claimed.save();
          continue;
        }

        // Prevent reminder after appointment completion
        if (["48h", "24h", "2h"].includes(reminder.reminderType) && appointment.status === "completed") {
          claimed.status = "cancelled";
          claimed.failureReason = "Appointment already completed";
          await claimed.save();
          continue;
        }

        const patientName = appointment.patientId?.fullName || "Patient";
        const doctorName = appointment.doctorId?.userId?.name || appointment.doctorId?.fullName || "TriGyna Specialist";
        let templateId = "appointment_reminder";
        let noticeText = "Upcoming Consultation Reminder";

        if (reminder.reminderType === "48h") {
          noticeText = "Upcoming Consultation (in 48 Hours)";
        } else if (reminder.reminderType === "24h") {
          noticeText = "Consultation Reminder (Tomorrow)";
        } else if (reminder.reminderType === "2h") {
          noticeText = "Consultation Starting Shortly (in 2 Hours)";
        } else if (reminder.reminderType.startsWith("followup_")) {
          templateId = "appointment_followup";
        } else if (reminder.reminderType === "missed") {
          templateId = "missed_appointment";
        }

        const dispatchResult = await emailService.sendTemplateEmail({
          to: reminder.recipientEmail,
          templateId,
          data: {
            patientName,
            doctorName,
            date: appointment.appointmentDate,
            time: appointment.startTime,
            notice: noticeText,
            mode: appointment.mode || "Online Video Call",
            meetingLink: appointment.meetingLink,
            appointmentCode: appointment.appointmentCode,
          },
          patientId: appointment.patientId?._id,
          idempotencyKey: `remind_${reminder._id}_${reminder.reminderType}`,
          forceImmediate: true,
        });

        if (dispatchResult.success) {
          claimed.status = "sent";
          claimed.sentAt = new Date();
          claimed.emailLogId = dispatchResult.emailLogId;
          claimed.failureReason = null;
        } else {
          claimed.status = "failed";
          claimed.failureReason = dispatchResult.error || "Email provider dispatch failure";
        }

        await claimed.save();
      } catch (remErr) {
        console.error(`[Email Scheduler] Error processing reminder ${reminder._id}:`, remErr.message);
        reminder.status = "failed";
        reminder.failureReason = remErr.message;
        await reminder.save().catch(() => {});
      }
    }
  }

  /**
   * Start scheduler background polling loop
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNextPoll();
    console.log("[Email Scheduler] Started automated appointment reminder & follow-up scheduler.");
  }

  /**
   * Stop scheduler background polling loop
   */
  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log("[Email Scheduler] Stopped automated appointment reminder & follow-up scheduler.");
  }

  scheduleNextPoll() {
    if (!this.isRunning) return;
    this.timer = setTimeout(async () => {
      try {
        await this.processDueReminders();
      } catch (err) {
        console.error("[Email Scheduler] Error in poll cycle:", err.message);
      } finally {
        this.scheduleNextPoll();
      }
    }, this.pollIntervalMs);
  }
}

module.exports = new EmailScheduler();
