const express = require("express");
const { createRoom, getRoom } = require("../controllers/room.controller");
const { requireAuth, optionalAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", requireAuth, createRoom);
router.get("/:roomId", optionalAuth, getRoom);

module.exports = router;
