import { useEffect, useMemo, useRef, useState } from "react";
import { ACTIONS } from "../../constants/actions";
import { socket } from "../../services/socket";

export default function ChatPanel({ roomId, username }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [typingUser, setTypingUser] = useState("");
  const listRef = useRef(null);

  const myName = useMemo(() => String(username || "").trim(), [username]);

  //  Load persisted messages for this room on mount / room change
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

  // Receive Messages
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

  //  Typing Indicator
  useEffect(() => {
    socket.on("typing", ({ username }) => {
      if (username !== myName) {
        setTypingUser(username);
        setTimeout(() => setTypingUser(""), 1500);
      }
    });

    return () => socket.off("typing");
  }, [myName]);

  // 🔽 Auto Scroll
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  //  Persist messages per room so they survive refresh
  useEffect(() => {
    if (!roomId) return;
    try {
      const compact = messages.slice(-200);
      localStorage.setItem(`codejam-chat-${roomId}`, JSON.stringify(compact));
    } catch {
      // ignore quota / serialization errors
    }
  }, [messages, roomId]);

  //  Send Message
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
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 flex flex-col">
      
      {/* Header */}
      <div className="border-b border-slate-800 px-3 py-2">
        <h3 className="text-sm font-semibold text-slate-200">Chat</h3>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 max-h-[300px] overflow-y-auto px-3 py-2 space-y-2"
      >
        {messages.length === 0 ? (
          <p className="text-xs text-slate-500">No messages yet 👋</p>
        ) : (
          messages.map((m, index) => {
            const isMe = m.username === myName;
            const prevMsg = messages[index - 1];
            const showName =
              !prevMsg || prevMsg.username !== m.username;

            return (
              <div
                key={m.id}
                className={`flex ${
                  isMe ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] w-fit px-4 py-2 text-sm shadow rounded-2xl ${
                    isMe
                      ? "bg-emerald-500 text-white rounded-br-none"
                      : "bg-slate-700 text-white rounded-bl-none"
                  }`}
                >
                  {/* Username */}
                  {!isMe && showName && (
                    <p className="text-[11px] font-semibold text-emerald-300 mb-1">
                      {m.username}
                    </p>
                  )}

                  {/* Reply */}
                  {m.replyTo && (
                    <div className="mb-1 border-l-4 border-emerald-400 bg-black/20 px-2 py-1 rounded">
                      <p className="text-[10px] opacity-70">
                        {m.replyTo.username}
                      </p>
                      <p className="text-[11px] truncate opacity-80">
                        {m.replyTo.message}
                      </p>
                    </div>
                  )}

                  {/* Message */}
                  <p className="break-words whitespace-pre-wrap">
                    {m.message}
                  </p>

                  {/* Time */}
                  <div className="text-[10px] opacity-70 text-right mt-1">
                    {new Date(m.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  {/* Reply Button */}
                  <div className="mt-1 text-right">
                    <button
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

      {/* Typing Indicator */}
      {typingUser && (
        <p className="text-xs text-slate-400 px-3 pb-1">
          {typingUser} is typing...
        </p>
      )}

      {/* Reply Preview */}
      {replyTo && (
        <div className="px-3 pb-2">
          <div className="bg-slate-800/60 border border-slate-700 rounded px-2 py-1 text-xs">
            Replying to <b>{replyTo.username}</b>
            <p className="truncate text-slate-400">
              {replyTo.message}
            </p>
            <button
              onClick={() => setReplyTo(null)}
              className="text-red-400 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-800 px-3 py-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            socket.emit("typing", { roomId, username: myName });
          }}
          placeholder="Type a message..."
          className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          className="bg-indigo-600 px-4 py-2 rounded-md text-white hover:bg-indigo-500"
        >
          Send
        </button>
      </div>
    </div>
  );
}