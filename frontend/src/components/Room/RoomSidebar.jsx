import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import MembersList from "./MembersList";
import { socket } from "../../services/socket";
import ChatPanel from "./ChatPanel";
import VoicePanel from "./VoicePanel";
import FileTabsPanel from "./FileTabsPanel";
import Avatar from "../common/Avatar";

const SIDEBAR_TABS = [
  { id: "chat", label: "Chat" },
  { id: "tabs", label: "Tabs" },
  { id: "friends", label: "Friends" },
];

export default function RoomSidebar({
  roomId,
  username,
  clients,
  files,
  filePresence,
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chat");
  const [menuOpen, setMenuOpen] = useState(false);

  const leaveRoom = () => {
    try {
      socket.disconnect();
    } catch {
      /* ignore */
    }
    toast.success("Left room");
    navigate("/", { replace: true });
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <aside className="flex w-[min(100%,280px)] shrink-0 flex-col border-r border-[var(--cj-border)] bg-[var(--cj-panel)] min-h-0">
      {/* User profile badge */}
      <div className="border-b border-[var(--cj-border)] px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={username} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--cj-text)]">
                {username}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="cj-status-bracket font-mono text-[10px] uppercase tracking-widest text-amber-500/90 drop-shadow-sm">[ ACTIVE ]</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-[var(--cj-radius)] px-2 py-1 text-[var(--cj-muted)] hover:bg-[var(--cj-panel-elevated)]"
              aria-label="Menu"
            >
              ⋮
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-40 rounded-[var(--cj-radius)] border border-[var(--cj-border)] bg-[var(--cj-panel-elevated)] py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      copyRoomId();
                    }}
                    className="block w-full px-3 py-2 text-left text-xs font-normal text-[var(--cj-text)] hover:bg-[var(--cj-panel)]"
                  >
                    Copy room ID
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      leaveRoom();
                    }}
                    className="block w-full px-3 py-2 text-left text-xs text-[var(--cj-danger)] hover:bg-[var(--cj-panel)]"
                  >
                    Leave room
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable middle: project + collaborators */}
      <div className="cj-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-[var(--cj-border)] px-4 py-3">
          <p className="cj-label mb-2">Project</p>
          <div className="cj-input flex items-center justify-between px-3 py-2 text-sm font-normal">
            <span>CodeJam</span>
            <span className="text-[var(--cj-muted)]">▾</span>
          </div>
        </div>

        <div className="px-4 py-3">
          <MembersList clients={clients} currentUsername={username} />
        </div>
      </div>

      {/* Bottom-docked chat with sub-tabs */}
      <div className="flex min-h-[240px] shrink-0 flex-col border-t border-[var(--cj-border)] bg-[var(--cj-bg)] px-4 py-3">
        <div className="mb-2 flex gap-0 border border-[var(--cj-border-dim)] bg-[var(--cj-panel)] p-0">
          {SIDEBAR_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`cj-sidebar-tab ${activeTab === tab.id ? "cj-sidebar-tab-active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {activeTab === "chat" && (
            <ChatPanel roomId={roomId} username={username} compact />
          )}
          {activeTab === "tabs" && (
            <FileTabsPanel files={files} filePresence={filePresence} />
          )}
          {activeTab === "friends" && (
            <VoicePanel
              roomId={roomId}
              username={username}
              clients={clients}
            />
          )}
        </div>
      </div>
    </aside>
  );
}
