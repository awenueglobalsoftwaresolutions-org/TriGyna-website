const Notification = require("./notification.model");
const { sendSuccess } = require("../../shared/response");
const { NotFoundError } = require("../../shared/errors");

async function listNotifications(req, res, next) {
  try {
    const notifications = await Notification.find({
      $or: [
        { recipientId: req.user._id },
        { recipientRole: req.user.role },
        { recipientRole: "all" },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(30);

    return sendSuccess(res, { notifications }, "Notifications retrieved successfully");
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

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead,
};
