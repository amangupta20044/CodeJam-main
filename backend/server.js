const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const ACTIONS = require("./Actions");
const cors = require("cors");
const axios = require("axios");
const server = http.createServer(app);
require("dotenv").config();
const connectDB = require("./src/db/db");
const Room = require("./src/models/room.model");
const RoomFile = require("./src/models/file.model");
const {
  parseBearerToken,
  verifyToken,
} = require("./src/middlewares/auth.middleware");

const authRoutes = require("./src/routes/auth.routes");
const roomRoutes = require("./src/routes/room.routes");

// connect to database
connectDB();

const languageConfig = {
  python3: { versionIndex: "3" },
  java: { versionIndex: "3" },
  cpp: { versionIndex: "4" },
  nodejs: { versionIndex: "3" },
  c: { versionIndex: "4" },
  ruby: { versionIndex: "3" },
  go: { versionIndex: "3" },
  scala: { versionIndex: "3" },
  bash: { versionIndex: "3" },
  sql: { versionIndex: "3" },
  pascal: { versionIndex: "2" },
  csharp: { versionIndex: "3" },
  php: { versionIndex: "3" },
  swift: { versionIndex: "3" },
  rust: { versionIndex: "3" },
  r: { versionIndex: "3" },
};

app.use(
  cors({
    origin: "*",
  }),
);
app.use(express.json());

// auth routes

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const MAX_FILES_PER_ROOM = 10;
const userSocketMap = {};
const roomActiveFileMap = {};

function buildFilePresence(roomId) {
  const roomSocketIds = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
  const presence = {};

  roomSocketIds.forEach((socketId) => {
    const socket = io.sockets.sockets.get(socketId);
    const fileId = socket?.currentFileId;
    const username = userSocketMap[socketId]?.username || "Anonymous";

    if (!fileId) return;

    if (!presence[fileId]) {
      presence[fileId] = [];
    }

    presence[fileId].push({ socketId, username });
  });

  return presence;
}

function emitFilePresence(roomId) {
  io.to(roomId).emit(ACTIONS.FILE_PRESENCE_STATE, {
    presence: buildFilePresence(roomId),
  });
}

function mapFileDoc(fileDoc) {
  return {
    id: fileDoc._id.toString(),
    roomId: fileDoc.roomId,
    name: fileDoc.name,
    language: fileDoc.language,
    code: fileDoc.code ?? "",
    updatedAt: fileDoc.updatedAt,
  };
}

function normalizeFileName(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 60);
}

function isRoomAdmin(roomDoc, userId) {
  if (!roomDoc?.creator || !userId) return false;
  return String(roomDoc.creator) === String(userId);
}

async function getRoomFiles(roomId) {
  const files = await RoomFile.find({ roomId }).sort({ createdAt: 1 });
  return files.map(mapFileDoc);
}

async function ensureRoomHasAtLeastOneFile(roomId, userId = null) {
  const count = await RoomFile.countDocuments({ roomId });
  if (count > 0) return;
  await RoomFile.create({
    roomId,
    name: "main.js",
    language: "javascript",
    code: '// Welcome to CodeJam - start collaborating\nconsole.log("Hello");',
    createdBy: userId,
  });
}

const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId]?.username,
      };
    },
  );
};

io.use((socket, next) => {
  const tokenFromAuth = socket.handshake.auth?.token;
  const tokenFromHeader = parseBearerToken(
    socket.handshake.headers?.authorization || "",
  );
  const payload = verifyToken(tokenFromAuth || tokenFromHeader || null);
  socket.userId = payload?.userId ? String(payload.userId) : null;
  next();
});

io.on("connection", (socket) => {
  console.log("Socket connected", socket.id);
  socket.on(ACTIONS.JOIN, async ({ roomId, username }) => {
    try {
      if (!roomId || !username) {
        socket.emit(ACTIONS.FILE_ERROR, {
          message: "Room ID and username are required",
        });
        return;
      }

      const room = await Room.findOne({ roomId }).lean();
      if (!room) {
        socket.emit(ACTIONS.FILE_ERROR, { message: "Room does not exist" });
        return;
      }

      userSocketMap[socket.id] = { username, userId: socket.userId };
      socket.join(roomId);
      socket.currentRoomId = roomId;
      const clients = getAllConnectedClients(roomId);

      io.to(roomId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });

      await ensureRoomHasAtLeastOneFile(roomId, socket.userId);
      const files = await getRoomFiles(roomId);
      const validActiveId = files.some(
        (f) => f.id === roomActiveFileMap[roomId],
      );
      const activeFileId = validActiveId
        ? roomActiveFileMap[roomId]
        : files[0]?.id;

      if (activeFileId) {
        roomActiveFileMap[roomId] = activeFileId;
      }

      socket.currentFileId = activeFileId || files[0]?.id || null;

      socket.emit(ACTIONS.FILES_STATE, {
        files,
        activeFileId,
        maxFiles: MAX_FILES_PER_ROOM,
        isAdmin: isRoomAdmin(room, socket.userId),
      });

      emitFilePresence(roomId);
    } catch (error) {
      socket.emit(ACTIONS.FILE_ERROR, { message: "Failed to join room" });
    }
  });

  // sync the code
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });
  // when new user join the room all the code which are there are also shows on that persons editor
  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.FILE_CREATE, async ({ roomId, name, language }) => {
    try {
      if (!roomId || !socket.rooms.has(roomId)) return;
      const fileName = normalizeFileName(name);

      if (!fileName) {
        socket.emit(ACTIONS.FILE_ERROR, { message: "File name is required" });
        return;
      }

      const totalFiles = await RoomFile.countDocuments({ roomId });
      if (totalFiles >= MAX_FILES_PER_ROOM) {
        socket.emit(ACTIONS.FILE_ERROR, {
          message: `You can create up to ${MAX_FILES_PER_ROOM} files`,
        });
        return;
      }

      const created = await RoomFile.create({
        roomId,
        name: fileName,
        language: String(language || "javascript"),
        code: "",
        createdBy: socket.userId,
      });

      io.to(roomId).emit(ACTIONS.FILE_CREATED, { file: mapFileDoc(created) });
    } catch (error) {
      if (error?.code === 11000) {
        socket.emit(ACTIONS.FILE_ERROR, {
          message: "A file with this name already exists",
        });
        return;
      }
      socket.emit(ACTIONS.FILE_ERROR, { message: "Failed to create file" });
    }
  });

  socket.on(ACTIONS.FILE_SWITCH, async ({ roomId, fileId }) => {
    try {
      if (!roomId || !fileId || !socket.rooms.has(roomId)) return;
      const file = await RoomFile.findOne({ _id: fileId, roomId }).lean();
      if (!file) return;
      socket.currentRoomId = roomId;
      socket.currentFileId = String(fileId);
      socket.emit(ACTIONS.FILE_SWITCHED, { fileId: String(fileId) });
      emitFilePresence(roomId);
    } catch {
      socket.emit(ACTIONS.FILE_ERROR, { message: "Failed to switch file" });
    }
  });

  socket.on(
    ACTIONS.FILE_CODE_CHANGE,
    async ({ roomId, fileId, code, language }) => {
      try {
        if (!roomId || !fileId || !socket.rooms.has(roomId)) return;
        const nextCode = String(code ?? "");
        const nextLanguage = String(language || "javascript");
        socket.currentRoomId = roomId;
        socket.currentFileId = String(fileId);
        const result = await RoomFile.updateOne(
          { _id: fileId, roomId },
          {
            $set: {
              code: nextCode,
              language: nextLanguage,
            },
          },
        );
        if (!result.matchedCount) return;
        socket.in(roomId).emit(ACTIONS.FILE_CODE_CHANGE, {
          fileId: String(fileId),
          code: nextCode,
          language: nextLanguage,
        });
        emitFilePresence(roomId);
      } catch {
        socket.emit(ACTIONS.FILE_ERROR, { message: "Failed to update file" });
      }
    },
  );

  socket.on(ACTIONS.FILE_RENAME, async ({ roomId, fileId, name }) => {
    try {
      if (!roomId || !fileId || !socket.rooms.has(roomId)) return;

      const room = await Room.findOne({ roomId }).lean();
      if (!isRoomAdmin(room, socket.userId)) {
        socket.emit(ACTIONS.FILE_ERROR, {
          message: "Only room admin can rename files",
        });
        return;
      }

      const fileName = normalizeFileName(name);
      if (!fileName) {
        socket.emit(ACTIONS.FILE_ERROR, { message: "File name is required" });
        return;
      }

      const result = await RoomFile.updateOne(
        { _id: fileId, roomId },
        { $set: { name: fileName } },
      );
      if (!result.matchedCount) {
        socket.emit(ACTIONS.FILE_ERROR, { message: "File not found" });
        return;
      }

      io.to(roomId).emit(ACTIONS.FILE_RENAMED, {
        fileId: String(fileId),
        name: fileName,
      });
    } catch (error) {
      if (error?.code === 11000) {
        socket.emit(ACTIONS.FILE_ERROR, {
          message: "A file with this name already exists",
        });
        return;
      }
      socket.emit(ACTIONS.FILE_ERROR, { message: "Failed to rename file" });
    }
  });

  socket.on(ACTIONS.FILE_DELETE, async ({ roomId, fileId }) => {
    try {
      if (!roomId || !fileId || !socket.rooms.has(roomId)) return;

      const room = await Room.findOne({ roomId }).lean();
      if (!isRoomAdmin(room, socket.userId)) {
        socket.emit(ACTIONS.FILE_ERROR, {
          message: "Only room admin can delete files",
        });
        return;
      }

      const allFiles = await getRoomFiles(roomId);
      if (allFiles.length <= 1) {
        socket.emit(ACTIONS.FILE_ERROR, {
          message: "At least one file is required",
        });
        return;
      }

      const exists = allFiles.some((f) => f.id === String(fileId));
      if (!exists) {
        socket.emit(ACTIONS.FILE_ERROR, { message: "File not found" });
        return;
      }

      await RoomFile.deleteOne({ _id: fileId, roomId });

      const remainingFiles = await getRoomFiles(roomId);
      const fallbackFileId = remainingFiles[0]?.id || null;

      const roomSocketIds = Array.from(
        io.sockets.adapter.rooms.get(roomId) || [],
      );
      roomSocketIds.forEach((socketId) => {
        const roomSocket = io.sockets.sockets.get(socketId);
        if (!roomSocket) return;
        if (String(roomSocket.currentFileId) === String(fileId)) {
          roomSocket.currentFileId = fallbackFileId;
          roomSocket.emit(ACTIONS.FILE_SWITCHED, { fileId: fallbackFileId });
        }
      });

      io.to(roomId).emit(ACTIONS.FILE_DELETED, {
        fileId: String(fileId),
        fallbackFileId,
      });
      emitFilePresence(roomId);
    } catch {
      socket.emit(ACTIONS.FILE_ERROR, { message: "Failed to delete file" });
    }
  });

  // leave room
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms].filter((r) => r !== socket.id);
    const leftUsername = userSocketMap[socket.id]?.username;

    rooms.forEach((roomId) => {
      // Compute the updated members list (excluding the socket that disconnected)
      const clients = getAllConnectedClients(roomId).filter(
        (c) => c.socketId !== socket.id,
      );

      io.to(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: leftUsername,
        clients,
      });

      socket.currentFileId = null;

      emitFilePresence(roomId);
    });

    delete userSocketMap[socket.id];
    socket.leave();
  });

  // Chat (room-wide)
  socket.on(ACTIONS.CHAT_MESSAGE, ({ roomId, message, username, replyTo }) => {
    const from = userSocketMap[socket.id]?.username || username || "Anonymous";
    const text = String(message ?? "").trim();
    if (!roomId || !text) return;

    io.to(roomId).emit(ACTIONS.CHAT_MESSAGE, {
      roomId,
      username: from,
      message: text,
      replyTo: replyTo || undefined,
      timestamp: Date.now(),
      socketId: socket.id,
    });
  });
  //  (Typing Event)
  socket.on("typing", ({ roomId, username }) => {
    socket.to(roomId).emit("typing", { username });
  });

  // Voice signaling (WebRTC via socket.io)
  socket.on(ACTIONS.VOICE_OFFER, ({ to, sdp }) => {
    if (!to || !sdp) return;
    io.to(to).emit(ACTIONS.VOICE_OFFER, { from: socket.id, sdp });
  });

  socket.on(ACTIONS.VOICE_ANSWER, ({ to, sdp }) => {
    if (!to || !sdp) return;
    io.to(to).emit(ACTIONS.VOICE_ANSWER, { from: socket.id, sdp });
  });

  socket.on(ACTIONS.VOICE_ICE_CANDIDATE, ({ to, candidate }) => {
    if (!to || !candidate) return;
    io.to(to).emit(ACTIONS.VOICE_ICE_CANDIDATE, {
      from: socket.id,
      candidate,
    });
  });
});

app.post("/compile", async (req, res) => {
  const { code, language } = req.body;

  if (!language || !languageConfig[language]) {
    return res.status(400).json({ error: "Unsupported or missing language" });
  }

  const clientId =
    process.env.JDOODLE_CLIENT_ID || process.env.jDoodle_clientId;
  const clientSecret =
    process.env.JDOODLE_CLIENT_SECRET ||
    process.env.jDoodle_clientSecret ||
    process.env.kDoodle_clientSecret;

  if (!clientId || !clientSecret) {
    return res.status(503).json({
      error:
        "Code execution is not configured. Set JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET in the server environment.",
    });
  }

  try {
    const response = await axios.post("https://api.jdoodle.com/v1/execute", {
      script: code ?? "",
      language,
      versionIndex: languageConfig[language].versionIndex,
      clientId,
      clientSecret,
    });

    res.json(response.data);
  } catch (error) {
    console.error(error?.response?.data || error);
    res.status(500).json({ error: "Failed to compile code" });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is runnint on port ${PORT}`));
