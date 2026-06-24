function FileTabsPanel({ files = [], filePresence = {} }) {
  return (
    <div className="cj-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto">
      {files.length === 0 ? (
        <p className="text-xs text-[var(--cj-muted)]">
          No files yet. Create one from the editor toolbar.
        </p>
      ) : (
        files.map((file) => {
          const workingUsers = filePresence[file.id] || [];
          const names = workingUsers.map((u) => u.username || "Anonymous");

          return (
            <div
              key={file.id}
              className="border border-[var(--cj-border)] bg-[var(--cj-surface)] px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-[var(--cj-text)]">
                  {file.name}
                </p>
                <span className="shrink-0 rounded-full bg-[var(--cj-panel)] px-2 py-0.5 text-[10px] text-[var(--cj-muted)]">
                  {file.language || "javascript"}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[var(--cj-muted)]">
                {names.length === 0
                  ? "No one on this file"
                  : names.join(", ")}
              </p>
            </div>
          );
        })
      )}
    </div>
  );
}

export default FileTabsPanel;
