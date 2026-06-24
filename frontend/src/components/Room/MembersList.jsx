import Avatar from "../common/Avatar";

export default function MembersList({ clients = [], currentUsername = "" }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="cj-label">&gt; Collaborators</p>
        <span className="cj-bracket text-[10px]">[{clients.length}]</span>
      </div>
      <div className="space-y-1">
        {clients.length === 0 ? (
          <p className="border border-dashed border-[var(--cj-border-dim)] px-3 py-4 text-center text-xs text-[var(--cj-muted)]">
            [ WAIT ] Scanning for nodes…
          </p>
        ) : (
          clients.map(({ socketId, username: name }) => {
            const isMe = name === currentUsername;
            return (
              <div
                key={socketId}
                className={`flex items-center gap-2.5 border border-transparent px-2 py-2 ${
                  isMe
                    ? "border-[var(--cj-border)] bg-[var(--cj-surface)]"
                    : "hover:border-[var(--cj-border)] hover:bg-[var(--cj-surface)]/50"
                }`}
              >
                <Avatar name={name || "Anonymous"} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold uppercase tracking-wider text-[var(--cj-text)]">
                    {name || "Anonymous"}
                  </p>
                  <p className="cj-status-bracket mt-0.5 text-[10px]">
                    [ ACTIVE ]
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
