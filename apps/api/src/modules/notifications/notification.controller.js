const Notification = require("./notification.model");
const NotificationLog = require("./notification-log.model");
const pushService = require("./push.service");
const emailService = require("./email.service");
const whatsappService = require("../integrations/whatsapp.service");
const { sendSuccess } = require("../../shared/response");
const { NotFoundError, ValidationError } = require("../../shared/errors");

async function listNotificationLogs(req, res, next) {
  try {
    const { channel, status, eventType, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (channel) filter.channel = channel;
    if (status) filter.status = status;
    if (eventType) filter.eventType = eventType;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const logs = await NotificationLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.max(1, parseInt(limit, 10)))
      .populate("patientId", "fullName phone email")
      .populate("invoiceId", "invoiceNumber totalAmount")
      .populate("paymentId", "paymentNumber amount");

    const total = await NotificationLog.countDocuments(filter);

    return sendSuccess(res, { logs, total, page: parseInt(page, 10), limit: parseInt(limit, 10) }, "Notification logs retrieved");
  } catch (err) {
    return next(err);
  }
}

async function dispatchPaymentLinkNotification(req, res, next) {
  try {
    const { email, phone, customerName, serviceName, amount, checkoutUrl, patientId, invoiceId, paymentId } = req.body;
    if (!checkoutUrl) {
      return next(new ValidationError("checkoutUrl is required"));
    }

    const results = { email: null, whatsapp: null };

    if (email) {
      results.email = await emailService.sendTemplateEmail({
        to: email,
        templateId: "payment_link_dispatch",
        data: {
          customerName: customerName || "Valued Patient",
          serviceName: serviceName || "TriGyna Healthcare Protocol",
          amount: amount || 0,
          checkoutUrl,
        },
        patientId,
        invoiceId,
        paymentId,
      });
    }

    if (phone) {
      results.whatsapp = await whatsappService.sendPaymentLinkAlert({
        phone,
        customerName: customerName || "Valued Patient",
        serviceName: serviceName || "TriGyna Healthcare Protocol",
        amount: amount || 0,
        checkoutUrl,
      });
    }

    return sendSuccess(res, results, "Payment link notification dispatched");
  } catch (err) {
    return next(err);
  }
}

async function dispatchPaymentSuccessNotification(req, res, next) {
  try {
    const { email, phone, customerName, serviceName, amount, invoiceNumber, receiptNumber, transactionId, patientId, invoiceId, paymentId } = req.body;

    const results = { email: null, whatsapp: null };

    if (email) {
      results.email = await emailService.sendTemplateEmail({
        to: email,
        templateId: "payment_success",
        data: {
          customerName: customerName || "Valued Patient",
          serviceName: serviceName || "TriGyna Healthcare Consultation",
          amount: amount || 0,
          invoiceNumber: invoiceNumber || "N/A",
          receiptNumber: receiptNumber || "N/A",
          transactionId: transactionId || "N/A",
        },
        patientId,
        invoiceId,
        paymentId,
      });
    }

    if (phone) {
      results.whatsapp = await whatsappService.sendPaymentSuccessReceipt({
        phone,
        customerName: customerName || "Valued Patient",
        serviceName: serviceName || "TriGyna Healthcare Consultation",
        amount: amount || 0,
        receiptNumber: receiptNumber || "N/A",
      });
    }

    return sendSuccess(res, results, "Payment success notification dispatched");
  } catch (err) {
    return next(err);
  }
}

async function listNotifications(req, res, next) {
  try {
    const { type, read } = req.query;

    const query = {
      $or: [
        { recipientId: req.user._id },
        { recipientRole: req.user.role },
        { recipientRole: "all" },
      ],
    };

    if (type && type !== "all") {
      query.type = type;
    }

    if (read !== undefined) {
      query.read = read === "true";
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      read: false,
      $or: [
        { recipientId: req.user._id },
        { recipientRole: req.user.role },
        { recipientRole: "all" },
      ],
    });

    return sendSuccess(
      res,
      {
        notifications,
        unreadCount,
        total: notifications.length,
      },
      "Notifications retrieved successfully"
    );
  } catch (err) {
    return next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return next(new NotFoundError("Notification not found"));
    }

    return sendSuccess(res, { notification }, "Notification marked as read");
  } catch (err) {
    return next(err);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    await Notification.updateMany(
      {
        read: false,
        $or: [
          { recipientId: req.user._id },
          { recipientRole: req.user.role },
          { recipientRole: "all" },
        ],
      },
      { read: true }
    );

    return sendSuccess(res, { success: true }, "All notifications marked as read");
  } catch (err) {
    return next(err);
  }
}

async function subscribePushToken(req, res, next) {
  try {
    const { token, platform, userAgent } = req.body;
    if (!token) {
      return next(new ValidationError("Device push token is required"));
    }

    const registration = await pushService.registerToken({
      userId: req.user._id,
      role: req.user.role,
      token,
      platform: platform || "web",
      userAgent: userAgent || req.headers["user-agent"],
    });

    return sendSuccess(
      res,
      { registration },
      "Push notification device token registered successfully",
      201
    );
  } catch (err) {
    return next(err);
  }
}

async function unsubscribePushToken(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) {
      return next(new ValidationError("Device push token is required to unsubscribe"));
    }

    await pushService.unregisterToken(token);
    return sendSuccess(res, { success: true }, "Push token deactivated");
  } catch (err) {
    return next(err);
  }
}

async function sendTestPushNotification(req, res, next) {
  try {
    const outcome = await pushService.sendPushNotification({
      userId: req.user._id,
      role: req.user.role,
      title: "TriGyna Care Desk Notification",
      body: "This is a test notification confirming device push connectivity.",
    });

    return sendSuccess(res, { outcome }, "Test push notification dispatched");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listNotifications,
  listNotificationLogs,
  dispatchPaymentLinkNotification,
  dispatchPaymentSuccessNotification,
  markAsRead,
  markAllAsRead,
  subscribePushToken,
  unsubscribePushToken,
  sendTestPushNotification,
};
