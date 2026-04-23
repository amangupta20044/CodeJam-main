// All the events

const ACTIONS = {
  JOIN: "join",
  JOINED: "joined",
  DISCONNECTED: "disconnected",
  CODE_CHANGE: "code-change",
  SYNC_CODE: "sync-code",
  FILES_STATE: "files-state",
  FILE_CREATE: "file-create",
  FILE_CREATED: "file-created",
  FILE_SWITCH: "file-switch",
  FILE_SWITCHED: "file-switched",
  FILE_PRESENCE_STATE: "file-presence-state",
  FILE_CODE_CHANGE: "file-code-change",
  FILE_RENAME: "file-rename",
  FILE_RENAMED: "file-renamed",
  FILE_DELETE: "file-delete",
  FILE_DELETED: "file-deleted",
  FILE_ERROR: "file-error",
  LEAVE: "leave",
  CHAT_MESSAGE: "chat-message",
  VOICE_OFFER: "voice-offer",
  VOICE_ANSWER: "voice-answer",
  VOICE_ICE_CANDIDATE: "voice-ice-candidate",
};

module.exports = ACTIONS;
