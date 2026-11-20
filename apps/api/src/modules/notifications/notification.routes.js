const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const {
  listNotifications,
  markAsRead,
  markAllAsRead,
  subscribePushToken,
  unsubscribePushToken,
  sendTestPushNotification,
} = require("./notification.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", listNotifications);
router.patch("/read-all", markAllAsRead);
router.post("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

// Web & Mobile Push Token endpoints
router.post("/push/subscribe", subscribePushToken);
router.post("/push/unsubscribe", unsubscribePushToken);
router.post("/push/test", sendTestPushNotification);

module.exports = router;
