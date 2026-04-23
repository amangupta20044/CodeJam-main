export default function MembersList({ clients = [] }) {
  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-300">Connected</h3>
      <div className="max-h-[140px] space-y-2 overflow-y-auto">
        {clients.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-600 bg-slate-800/50 px-3 py-4 text-center text-xs text-slate-500">
            Waiting for collaborators…
          </p>
        ) : (
          clients.map(({ socketId, username: name }) => (
            <div
              key={socketId}
              className="flex items-center gap-2 rounded-lg bg-slate-700/80 px-3 py-2 text-sm"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-emerald-400"
                aria-hidden
              />
              <span className="truncate">{name || "Anonymous"}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
