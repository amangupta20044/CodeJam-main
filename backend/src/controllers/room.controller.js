const Room = require("../models/room.model");
const RoomFile = require("../models/file.model");

const DEFAULT_FILE = {
  name: "main.js",
  language: "javascript",
  code: '// Welcome to CodeJam - start collaborating\nconsole.log("Hello");',
};

function randomRoomId() {
  return Math.random().toString(36).slice(2, 10);
}

exports.createRoom = async (req, res) => {
  try {
    let roomId = String(req.body?.roomId || "").trim();
    if (!roomId) {
      roomId = randomRoomId();
    }

    const existing = await Room.findOne({ roomId }).lean();
    if (existing) {
      return res.status(409).json({ message: "Room already exists" });
    }

    const room = await Room.create({
      roomId,
      creator: req.user.id,
    });

    await RoomFile.create({
      roomId,
      name: DEFAULT_FILE.name,
      language: DEFAULT_FILE.language,
      code: DEFAULT_FILE.code,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      roomId: room.roomId,
      isAdmin: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create room",
      error: error.message,
    });
  }
};

exports.getRoom = async (req, res) => {
  try {
    const roomId = String(req.params.roomId || "").trim();
    const room = await Room.findOne({ roomId }).lean();

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isAdmin = Boolean(
      req.user?.id && String(room.creator) === String(req.user.id),
    );

    return res.status(200).json({
      roomId,
      creatorId: String(room.creator),
      isAdmin,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch room",
      error: error.message,
    });
  }
};
