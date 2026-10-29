const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const { listNotifications, markAsRead } = require("./notification.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", listNotifications);
router.patch("/:id/read", markAsRead);

module.exports = router;
