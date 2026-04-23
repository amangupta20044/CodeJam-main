const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    language: {
      type: String,
      required: true,
      default: "javascript",
      trim: true,
    },
    code: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

fileSchema.index({ roomId: 1, name: 1 }, { unique: true });

const RoomFile = mongoose.model("RoomFile", fileSchema);

module.exports = RoomFile;
