const Notification = require("./notification.model");
const pushService = require("./push.service");
const { sendSuccess } = require("../../shared/response");
const { NotFoundError, ValidationError } = require("../../shared/errors");

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
  markAsRead,
  markAllAsRead,
  subscribePushToken,
  unsubscribePushToken,
  sendTestPushNotification,
};
