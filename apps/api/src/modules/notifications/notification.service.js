const Notification = require("./notification.model");
const emailService = require("./email.service");
const pushService = require("./push.service");
const whatsappService = require("../integrations/whatsapp.service");
const automationService = require("../integrations/automation.service");

/**
 * Dispatch a system notification event
 * Automatically resolves target recipients, creates durable in-app notification records,
 * and asynchronously triggers Email and Web/Mobile Push channels.
 */
async function dispatchNotificationEvent(event, data) {
  try {
    const notificationsToCreate = [];

    switch (event) {
      case "lead.created": {
        const { lead } = data;
        const leadName = lead.fullName || lead.name || "Visitor";
        notificationsToCreate.push({
          recipientRole: "sales",
          title: "New Lead Captured",
          message: `Lead ${leadName} from ${lead.source || "Website"} is waiting for follow-up.`,
          type: "lead",
          link: `/sales/dashboard`,
        });
        notificationsToCreate.push({
          recipientRole: "admin",
          title: "New Lead Received",
          message: `${leadName} registered interest in ${lead.serviceInterest || lead.interestedService || "General Services"}.`,
          type: "lead",
          link: `/admin/crm`,
        });

        // Email acknowledgement to prospective patient
        if (lead.email) {
          emailService.sendEmail({
            to: lead.email,
            templateId: "enquiry_acknowledgement",
            templateData: {
              name: leadName,
              service: lead.serviceInterest || "Women's Health Care",
            },
          }).catch((e) => console.warn("[Email Service] Enquiry ack error:", e.message));
        }

        // Push notification to sales staff
        pushService.sendPushNotification({
          role: "sales",
          title: "New Lead Alert",
          body: `${leadName} submitted an enquiry for ${lead.serviceInterest || "General Services"}`,
          data: { leadId: lead._id?.toString() },
        }).catch((e) => console.warn("[Push Service] Lead push alert error:", e.message));

        automationService.trigger("crm.lead.created", {
          lead,
          phone: lead.phone,
          customerPhone: lead.phone,
          fullName: leadName,
        }).catch((e) => console.warn("[Automation Engine] Lead trigger error:", e.message));

        break;
      }

      case "appointment.booked": {
        const { appointment, doctorUser, patientUser, patientName } = data;
        if (doctorUser?._id) {
          notificationsToCreate.push({
            recipientId: doctorUser._id,
            recipientRole: "doctor",
            title: "New Appointment Booked",
            message: `Consultation booked with ${patientName || "Patient"} for ${appointment.appointmentDate} at ${appointment.startTime} (${appointment.mode}).`,
            type: "appointment",
            link: `/doctor/dashboard`,
          });
        }
        if (patientUser?._id) {
          notificationsToCreate.push({
            recipientId: patientUser._id,
            recipientRole: "patient",
            title: "Appointment Confirmed",
            message: `Your consultation with TriGyna is scheduled for ${appointment.appointmentDate} at ${appointment.startTime}.`,
            type: "appointment",
            link: `/patient/appointments`,
          });
        }

        // Transactional email to patient
        const patientEmail = patientUser?.email || appointment.patientEmail;
        if (patientEmail) {
          emailService.sendEmail({
            to: patientEmail,
            templateId: "appointment_confirmation",
            templateData: {
              patientName: patientName || patientUser?.name || "Patient",
              doctorName: doctorUser?.name || "TriGyna Specialist",
              date: appointment.appointmentDate,
              time: appointment.startTime,
              mode: appointment.mode,
              meetingLink: appointment.meetingLink,
            },
          }).catch((e) => console.warn("[Email Service] Appointment email error:", e.message));
        }

        // Approved WhatsApp Confirmation Template Dispatch
        const patientPhone = appointment.patientPhone || patientUser?.phone;
        if (patientPhone) {
          whatsappService.sendTemplateMessage({
            to: patientPhone,
            templateName: "booking_confirmed",
            variables: [
              patientName || patientUser?.name || "Patient",
              doctorUser?.name || "TriGyna Specialist",
              appointment.appointmentDate,
              appointment.startTime,
              appointment.mode,
            ],
            initiator: { type: "system", name: "Appointment Booking Service" },
            patientId: patientUser?._id,
          }).catch((waErr) => console.warn("[WhatsApp Dispatch] Booking confirmation warning:", waErr.message));
        }

        automationService.trigger("appointment.booked", {
          appointment,
          doctorUser,
          patientUser,
          phone: patientPhone,
          patientName,
        }).catch((e) => console.warn("[Automation Engine] Appointment booked trigger error:", e.message));

        break;
      }

      case "appointment.meeting_link_updated": {
        const { appointment, doctorName, patientUser } = data;
        if (patientUser?._id) {
          notificationsToCreate.push({
            recipientId: patientUser._id,
            recipientRole: "patient",
            title: "Video Consultation Link Ready",
            message: `${doctorName || "Your doctor"} has added the secure video link for your consultation on ${appointment.appointmentDate} at ${appointment.startTime}.`,
            type: "appointment",
            link: `/patient/dashboard`,
          });
        }
        break;
      }

      case "appointment.reminder": {
        const { appointment, patientUser, doctorName } = data;
        if (patientUser?._id) {
          notificationsToCreate.push({
            recipientId: patientUser._id,
            recipientRole: "patient",
            title: "Appointment Reminder",
            message: `Reminder: Your consultation with ${doctorName || "TriGyna Doctor"} is scheduled for ${appointment.appointmentDate} at ${appointment.startTime}.`,
            type: "appointment",
            link: `/patient/dashboard`,
          });
        }

        const patientPhone = appointment?.patientPhone || patientUser?.phone;
        if (patientPhone) {
          whatsappService.sendTemplateMessage({
            to: patientPhone,
            templateName: "appointment_reminder",
            variables: [
              patientUser?.name || "Patient",
              doctorName || "TriGyna Doctor",
              appointment.startTime,
            ],
            initiator: { type: "system", name: "Appointment Reminder Engine" },
            patientId: patientUser?._id,
          }).catch((waErr) => console.warn("[WhatsApp Dispatch] Reminder template warning:", waErr.message));
        }

        automationService.trigger("appointment.reminder", {
          appointment,
          patientUser,
          doctorName,
          phone: patientPhone,
        }).catch((e) => console.warn("[Automation Engine] Reminder trigger error:", e.message));

        break;
      }

      case "consultation.finalized": {
        const { consultation, prescriptionCode, patientUser, doctorName } = data;
        if (patientUser?._id) {
          notificationsToCreate.push({
            recipientId: patientUser._id,
            recipientRole: "patient",
            title: "Prescription & Clinical Summary Available",
            message: `Your consultation summary and signed digital prescription ${prescriptionCode ? `#${prescriptionCode}` : ""} are ready in your portal.`,
            type: "clinical",
            link: `/patient/prescriptions`,
          });

          if (patientUser.email) {
            emailService.sendEmail({
              to: patientUser.email,
              templateId: "prescription_ready",
              templateData: {
                patientName: patientUser.name || "Patient",
                doctorName: doctorName || "your physician",
                prescriptionCode,
              },
            }).catch((e) => console.warn("[Email Service] Prescription email error:", e.message));
          }
        }
        break;
      }

      case "payment.captured": {
        const { invoice, payment, receipt, patientUser } = data;
        if (patientUser?._id) {
          notificationsToCreate.push({
            recipientId: patientUser._id,
            recipientRole: "patient",
            title: "Payment Received",
            message: `Your payment of ₹${payment.amount} has been verified. Receipt ${receipt?.receiptNumber || ""} is available.`,
            type: "billing",
            link: `/patient/dashboard`,
          });
        }

        const invNum = invoice?.invoiceNumber || data.order?.orderNumber || "Order";
        const balAmt = invoice?.balanceAmount ?? 0;

        notificationsToCreate.push({
          recipientRole: "sales",
          title: "Payment Collected",
          message: `Payment of ₹${payment.amount} collected for ${invNum}. Balance: ₹${balAmt}.`,
          type: "billing",
          link: `/sales/dashboard`,
        });

        notificationsToCreate.push({
          recipientRole: "admin",
          title: "Payment Verified",
          message: `₹${payment.amount} collected via ${payment.paymentProvider || "Razorpay"} for ${invNum}.`,
          type: "billing",
          link: `/admin/dashboard`,
        });

        const targetEmail = patientUser?.email;
        if (targetEmail) {
          emailService.sendEmail({
            to: targetEmail,
            templateId: "payment_receipt",
            templateData: {
              patientName: patientUser?.name || "Patient",
              amount: payment.amount,
              receiptNumber: receipt?.receiptNumber || "REC-" + Date.now(),
              invoiceNumber: invoice.invoiceNumber,
            },
          }).catch((e) => console.warn("[Email Service] Payment receipt email error:", e.message));
        }

        // Approved WhatsApp Payment Receipt Template Dispatch
        const targetPhone = patientUser?.phone || invoice?.customerPhone || invoice?.phone;
        if (targetPhone) {
          whatsappService.sendTemplateMessage({
            to: targetPhone,
            templateName: "payment_receipt",
            variables: [
              String(payment.amount),
              patientUser?.name || invoice?.customerName || "Patient",
              receipt?.receiptNumber || "REC-" + Date.now(),
              invoice?.serviceName || invoice?.invoiceNumber || "Consultation Service",
            ],
            initiator: { type: "system", name: "Billing Engine" },
            patientId: patientUser?._id,
          }).catch((waErr) => console.warn("[WhatsApp Dispatch] Payment receipt template warning:", waErr.message));
        }

        automationService.trigger("payment.captured", {
          invoice,
          payment,
          receipt,
          patientUser,
          phone: targetPhone,
        }).catch((e) => console.warn("[Automation Engine] Payment trigger error:", e.message));

        break;
      }

      case "whatsapp.escalation": {
        const { conversationId, customerPhone, customerName, reason } = data;
        notificationsToCreate.push({
          recipientRole: "sales",
          title: "WhatsApp Human Escalation Alert",
          message: `Urgent attention required for ${customerName} (+${customerPhone}): ${reason}`,
          type: "system",
          link: `/sales/dashboard?tab=whatsapp`,
        });
        notificationsToCreate.push({
          recipientRole: "admin",
          title: "WhatsApp Human Escalation Alert",
          message: `Conversation ${conversationId} escalated: ${reason}`,
          type: "system",
          link: `/admin/dashboard?tab=whatsapp`,
        });
        break;
      }

      case "system.alert": {
        const { title, message, role = "sales", userId } = data;
        notificationsToCreate.push({
          recipientId: userId,
          recipientRole: role,
          title: title || "System Alert",
          message: message || "System notification",
          type: "system",
        });
        break;
      }

      case "payment.failed": {
        const { invoice, payment, patientUser } = data;
        if (patientUser?._id) {
          notificationsToCreate.push({
            recipientId: patientUser._id,
            recipientRole: "patient",
            title: "Payment Attempt Failed",
            message: `Your payment attempt of ₹${payment.amount} for Invoice ${invoice?.invoiceNumber} could not be completed. You can retry anytime.`,
            type: "billing",
            link: `/patient/dashboard`,
          });
        }
        break;
      }

      case "refund.processed": {
        const { invoice, refundAmount, patientUser } = data;
        if (patientUser?._id) {
          notificationsToCreate.push({
            recipientId: patientUser._id,
            recipientRole: "patient",
            title: "Refund Processed",
            message: `A refund of ₹${refundAmount} for Invoice ${invoice.invoiceNumber} has been authorized.`,
            type: "billing",
            link: `/patient/dashboard`,
          });
        }
        break;
      }

      case "package.purchased": {
        const { packageName, totalSessions, patientUser, patientName } = data;
        if (patientUser?._id) {
          notificationsToCreate.push({
            recipientId: patientUser._id,
            recipientRole: "patient",
            title: "Healthcare Package Activated",
            message: `Your "${packageName}" is active with ${totalSessions} consultation sessions.`,
            type: "billing",
            link: `/patient/dashboard`,
          });
        }
        notificationsToCreate.push({
          recipientRole: "sales",
          title: "Package Converted",
          message: `${patientName || "A patient"} has activated the "${packageName}" (${totalSessions} sessions).`,
          type: "billing",
          link: `/sales/dashboard`,
        });
        break;
      }

      case "followup.due": {
        const { patientName, service, dueDate, staffUserId } = data;
        if (staffUserId) {
          notificationsToCreate.push({
            recipientId: staffUserId,
            recipientRole: "sales",
            title: "Patient Care Follow-up Due",
            message: `Follow-up due for ${patientName} (${service}) on ${dueDate}.`,
            type: "lead",
            link: `/sales/dashboard`,
          });
        }
        break;
      }

      default:
        break;
    }

    if (notificationsToCreate.length > 0) {
      await Notification.insertMany(notificationsToCreate);
    }
  } catch (err) {
    console.error(`[Notification Service] Event '${event}' dispatch error:`, err.message);
  }
}

module.exports = {
  dispatchNotificationEvent,
};
