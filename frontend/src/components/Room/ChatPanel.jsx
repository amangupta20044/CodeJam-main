import { useEffect, useMemo, useRef, useState } from "react";
import { ACTIONS } from "../../constants/actions";
import { socket } from "../../services/socket";
import Avatar from "../common/Avatar";

export default function ChatPanel({ roomId, username, compact = false }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [typingUser, setTypingUser] = useState("");
  const listRef = useRef(null);

  const myName = useMemo(() => String(username || "").trim(), [username]);

  useEffect(() => {
    if (!roomId) return;
    try {
      const raw = localStorage.getItem(`codejam-chat-${roomId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setMessages(parsed);
      }
    } catch {
      // ignore corrupted storage
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    const onMessage = ({
      roomId: eventRoomId,
      username: from,
      message,
      replyTo: incomingReplyTo,
      timestamp,
    }) => {
      if (eventRoomId && eventRoomId !== roomId) return;

      const msg = {
        id: `${timestamp}-${Math.random().toString(16).slice(2)}`,
        username: from || "Anonymous",
        message: String(message ?? ""),
        replyTo: incomingReplyTo || null,
        timestamp: timestamp || Date.now(),
      };

      setMessages((prev) => [...prev, msg].slice(-200));
    };

    socket.on(ACTIONS.CHAT_MESSAGE, onMessage);
    return () => socket.off(ACTIONS.CHAT_MESSAGE, onMessage);
  }, [roomId]);

  useEffect(() => {
    socket.on("typing", ({ username: typingName }) => {
      if (typingName !== myName) {
        setTypingUser(typingName);
        setTimeout(() => setTypingUser(""), 1500);
      }
    });

    return () => socket.off("typing");
  }, [myName]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (!roomId) return;
    try {
      const compactMessages = messages.slice(-200);
      localStorage.setItem(
        `codejam-chat-${roomId}`,
        JSON.stringify(compactMessages),
      );
    } catch {
      // ignore quota / serialization errors
    }
  }, [messages, roomId]);

  const send = () => {
    const message = text.trim();
    if (!message) return;

    socket.emit(ACTIONS.CHAT_MESSAGE, {
      roomId,
      message,
      username: myName,
      replyTo: replyTo
        ? { username: replyTo.username, message: replyTo.message }
        : undefined,
    });

    setText("");
    setReplyTo(null);
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${compact ? "" : "h-full"}`}>
      <div
        ref={listRef}
        className="cj-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-1 py-2"
      >
        {messages.length === 0 ? (
          <p className="px-1 text-xs text-[var(--cj-muted)]">
            No messages yet. Say hello!
          </p>
        ) : (
          messages.map((m, index) => {
            const isMe = m.username === myName;
            const prevMsg = messages[index - 1];
            const showName = !prevMsg || prevMsg.username !== m.username;

            return (
              <div
                key={m.id}
                className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
              >
                {!isMe && showName && (
                  <Avatar name={m.username} size="sm" className="mt-1" />
                )}
                {!isMe && !showName && <div className="w-7 shrink-0" />}
                <div
                  className={`max-w-[78%] border px-3 py-2 text-xs ${
                    isMe
                    ? "border-[var(--cj-border)] bg-[var(--cj-surface)] text-[var(--cj-text)]"
                    : "border-[var(--cj-border)] bg-zinc-900/50 text-[var(--cj-text-secondary)]"
                  }`}
                >
                  {!isMe && showName && (
                    <p className="mb-1 text-[10px] font-semibold text-[var(--cj-muted)]">
                      {m.username}
                    </p>
                  )}

                  {m.replyTo && (
                    <div className="mb-1 rounded border-l-2 border-[var(--cj-accent)] bg-black/20 px-2 py-1">
                      <p className="text-[10px] opacity-70">
                        {m.replyTo.username}
                      </p>
                      <p className="truncate text-[11px] opacity-80">
                        {m.replyTo.message}
                      </p>
                    </div>
                  )}

                  <p className="break-words whitespace-pre-wrap">{m.message}</p>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] opacity-70">
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setReplyTo({
                          username: m.username,
                          message: m.message,
                        })
                      }
                      className="text-[10px] opacity-70 hover:opacity-100"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {typingUser && (
        <p className="px-1 pb-1 text-xs text-[var(--cj-muted)]">
          {typingUser} is typing…
        </p>
      )}

      {replyTo && (
        <div className="px-1 pb-2">
          <div className="rounded-lg border border-[var(--cj-border)] bg-[var(--cj-panel-elevated)] px-2 py-1 text-xs">
            Replying to <b>{replyTo.username}</b>
            <p className="truncate text-[var(--cj-muted)]">
              {replyTo.message}
            </p>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-[var(--cj-danger)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-auto flex gap-2 border-t border-[var(--cj-border-soft)] pt-2">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            socket.emit("typing", { roomId, username: myName });
          }}
          placeholder="> type message..."
          className="cj-input flex-1 px-3 py-2 text-sm"
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          type="button"
          onClick={send}
          className="cj-btn cj-btn-send px-4 py-2 text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}
