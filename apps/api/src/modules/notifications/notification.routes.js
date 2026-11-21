const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");
const {
  listNotifications,
  listNotificationLogs,
  dispatchPaymentLinkNotification,
  dispatchPaymentSuccessNotification,
  markAsRead,
  markAllAsRead,
  subscribePushToken,
  unsubscribePushToken,
  sendTestPushNotification,
} = require("./notification.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", listNotifications);
router.get("/logs", requireRole("owner", "admin", "reception", "sales", "crm"), listNotificationLogs);
router.post("/payment-link", requireRole("owner", "admin", "reception", "sales", "crm"), dispatchPaymentLinkNotification);
router.post("/payment-success", requireRole("owner", "admin", "reception", "sales", "crm"), dispatchPaymentSuccessNotification);
router.patch("/read-all", markAllAsRead);
router.post("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

// Web & Mobile Push Token endpoints
router.post("/push/subscribe", subscribePushToken);
router.post("/push/unsubscribe", unsubscribePushToken);
router.post("/push/test", sendTestPushNotification);

module.exports = router;
