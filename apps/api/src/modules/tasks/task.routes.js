const express = require("express");
const {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
} = require("./task.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);

router.get("/", listTasks);
router.post("/", createTask);
router.patch("/:id", updateTask);
router.delete("/:id", requireRole("owner", "admin"), deleteTask);

module.exports = router;
