const express = require("express");
const { getCalendarEvents } = require("./calendar.controller");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/events", getCalendarEvents);

module.exports = router;
