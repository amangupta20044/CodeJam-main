import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import MembersList from "./MembersList";
import RoomInfo from "./RoomInfo";
import { socket } from "../../services/socket";
import ChatPanel from "./ChatPanel";
import VoicePanel from "./VoicePanel";

function FileWorkload({ files = [], filePresence = {} }) {
  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-300">Working on</h3>
      <div className="space-y-2">
        {files.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-600 bg-slate-800/50 px-3 py-4 text-center text-xs text-slate-500">
            Waiting for files…
          </p>
        ) : (
          files.map((file) => {
            const workingUsers = filePresence[file.id] || [];
            const names = workingUsers.map((u) => u.username || "Anonymous");
            return (
              <div
                key={file.id}
                className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {file.language || "javascript"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                    {workingUsers.length}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {names.length === 0 ? (
                    <span className="text-xs text-slate-500">
                      No one on this file
                    </span>
                  ) : (
                    names.slice(0, 3).map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300"
                      >
                        {name}
                      </span>
                    ))
                  )}
                  {names.length > 3 && (
                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                      +{names.length - 3}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function RoomSidebar({
  roomId,
  username,
  clients,
  files,
  filePresence,
}) {
  const navigate = useNavigate();

  const leaveRoom = () => {
    try {
      socket.disconnect();
    } catch {
      /* ignore */
    }
    toast.success("Left room");
    navigate("/", { replace: true });
  };

  return (
    <aside className="flex w-[min(100%,320px)] shrink-0 flex-col border-r border-slate-800 bg-slate-900/95 min-h-0">
      <div className="border-b border-slate-800 px-4 py-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">You</p>
        <p className="truncate font-medium text-slate-100">{username}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <RoomInfo roomId={roomId} />

        <MembersList clients={clients} />

        <ChatPanel roomId={roomId} username={username} />

        <VoicePanel roomId={roomId} username={username} clients={clients} />

        <div className="mt-auto pt-2">
          <button
            type="button"
            onClick={leaveRoom}
            className="w-full rounded-lg bg-red-600/90 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 cursor-pointer"
          >
            Leave room
          </button>
        </div>
      </div>
    </aside>
  );
}
