const { Webhook } = require("svix");
const emailConfig = require("../../config/email.config");
const EmailWebhookEvent = require("./email-webhook-event.model");
const EmailLog = require("./email-log.model");
const emailTrackingService = require("./email.tracking.service");
const EmailPreference = require("./email-preference.model");
const { sendSuccess, sendError } = require("../../shared/response");

/**
 * Maps Resend webhook event types to internal EmailLog status
 */
const EVENT_STATUS_MAP = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delivery_delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
};

/**
 * Verify Svix headers and signature using the Resend Webhook Secret
 */
function verifySvixSignature(rawBody, headers, secret) {
  if (!secret) {
    throw new Error("RESEND_WEBHOOK_SECRET is not configured on the server");
  }

  const svixId = headers["svix-id"];
  const svixTimestamp = headers["svix-timestamp"];
  const svixSignature = headers["svix-signature"];

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error("Missing required Svix webhook signature headers (svix-id, svix-timestamp, svix-signature)");
  }

  const wh = new Webhook(secret);
  // Verify using raw payload string and svix headers
  const payloadStr = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const verified = wh.verify(payloadStr, {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature,
  });

  return verified || JSON.parse(payloadStr);
}

/**
 * POST /api/v1/webhooks/resend
 * Public HTTPS webhook listener for Resend delivery notifications
 */
async function handleResendWebhook(req, res, next) {
  try {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    let verifiedPayload;

    // Cryptographic signature verification
    try {
      verifiedPayload = verifySvixSignature(rawBody, req.headers, emailConfig.webhookSecret);
    } catch (sigErr) {
      console.warn("[Resend Webhook Security] Signature verification failed:", sigErr.message);
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_SIGNATURE",
          message: "Webhook cryptographic signature verification failed.",
        },
      });
    }

    if (!verifiedPayload || typeof verifiedPayload !== "object") {
      return res.status(400).json({
        success: false,
        error: {
          code: "MALFORMED_PAYLOAD",
          message: "Payload could not be parsed as a valid Resend event.",
        },
      });
    }

    const { type: eventType, data: eventData, created_at: eventTime } = verifiedPayload;
    const providerEventId = req.headers["svix-id"] || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const providerEmailId = eventData?.email_id || eventData?.id || null;

    // Idempotency check: duplicate event protection
    const existingEvent = await EmailWebhookEvent.findOne({ providerEventId });
    if (existingEvent) {
      console.log(`[Resend Webhook] Duplicate event '${providerEventId}' safely acknowledged.`);
      return res.status(200).json({
        success: true,
        message: "Duplicate event acknowledged idempotently.",
        providerEventId,
      });
    }

    // Persist webhook event record
    const webhookEvent = await EmailWebhookEvent.create({
      providerEventId,
      eventType: eventType || "unknown",
      providerEmailId,
      eventTimestamp: eventTime ? new Date(eventTime) : new Date(),
      processingStatus: "received",
      payload: verifiedPayload,
    });

    // Map and update email lifecycle status
    const mappedStatus = EVENT_STATUS_MAP[eventType];
    let failureReason = null;

    if (eventType === "email.bounced") {
      failureReason = eventData?.bounce?.message || eventData?.reason || "Email address bounced";
    } else if (eventType === "email.failed") {
      failureReason = eventData?.error || "Email delivery failed";
    } else if (eventType === "email.complained") {
      failureReason = "Recipient marked email as spam / filed complaint";
    }

    if (mappedStatus && providerEmailId) {
      const updatedLog = await emailTrackingService.updateStatus({
        providerEmailId,
        newStatus: mappedStatus,
        reason: failureReason,
        eventTimestamp: eventTime ? new Date(eventTime) : new Date(),
      });

      if (updatedLog) {
        webhookEvent.processingStatus = "processed";
        await webhookEvent.save();

        // If recipient complained or hard bounced, handle suppression
        if (eventType === "email.complained" || eventType === "email.bounced") {
          const recipientEmail = updatedLog.recipient;
          if (recipientEmail) {
            await EmailPreference.updateOne(
              { email: recipientEmail },
              { $set: { marketing: false, newsletter: false, unsubscribeAll: true } },
              { upsert: false }
            );
            console.log(`[Resend Webhook] Suppressed marketing preferences for '${recipientEmail}' following ${eventType}`);
          }
        }
      } else {
        webhookEvent.processingStatus = "ignored";
        webhookEvent.error = `No matching EmailLog found for providerEmailId: ${providerEmailId}`;
        await webhookEvent.save();
      }
    } else {
      // For opened/clicked or other telemetry events
      webhookEvent.processingStatus = "processed";
      await webhookEvent.save();
    }

    return res.status(200).json({
      success: true,
      message: "Resend webhook event processed successfully.",
      providerEventId,
      eventType,
    });
  } catch (err) {
    console.error("[Resend Webhook] Processing error:", err.message);
    return res.status(500).json({
      success: false,
      error: {
        code: "WEBHOOK_INTERNAL_ERROR",
        message: "An internal error occurred during webhook processing.",
      },
    });
  }
}

module.exports = {
  handleResendWebhook,
  verifySvixSignature,
};
