import Editor from "@monaco-editor/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ACTIONS } from "../../constants/actions";
import { socket } from "../../services/socket";
import API from "../../services/api";
import { setupCodeJamMonacoTheme } from "../../utils/monacoTheme";
import {
  formatDurationMs,
  formatSystemHeader,
  formatStdoutLine,
  formatSystemError,
  formatStatusBar,
} from "../../utils/systemLog";
import {
  sysToastSuccess,
  sysToastError,
  sysToastInfo,
} from "../../utils/terminalToast";

const LANG_OPTIONS = [
  {
    id: "javascript",
    label: "JavaScript (Node)",
    monaco: "javascript",
    jdoodle: "nodejs",
  },
  { id: "python", label: "Python", monaco: "python", jdoodle: "python3" },
  { id: "cpp", label: "C++", monaco: "cpp", jdoodle: "cpp" },
  { id: "java", label: "Java", monaco: "java", jdoodle: "java" },
];

const DEFAULT_FILE = {
  id: "",
  roomId: "",
  name: "main.js",
  language: "javascript",
  code: "",
};

function IconPencil() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}

export default function CodeEditor({
  roomId,
  username,
  isAdmin,
  clients = [],
  onClientsChange,
  onFilesChange,
  onFilePresenceChange,
}) {
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState("");
  const [filePresence, setFilePresence] = useState({});
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [outputOpen, setOutputOpen] = useState(true);
  const [maxFiles, setMaxFiles] = useState(10);
  const [adminInRoom, setAdminInRoom] = useState(Boolean(isAdmin));
  const lastJoinKeyRef = useRef(null);
  const lastRunAtRef = useRef(null);

  const activeFile = useMemo(
    () =>
      files.find((file) => file.id === activeFileId) ||
      files[0] ||
      DEFAULT_FILE,
    [files, activeFileId],
  );

  const lang =
    LANG_OPTIONS.find((l) => l.id === activeFile.language) ?? LANG_OPTIONS[0];

  useEffect(() => {
    setAdminInRoom(Boolean(isAdmin));
  }, [isAdmin]);

  const upsertFile = useCallback(
    (nextFile) => {
      setFiles((prev) => {
        const idx = prev.findIndex((f) => f.id === nextFile.id);
        const nextFiles =
          idx === -1
            ? [...prev, nextFile]
            : prev.map((file) =>
                file.id === nextFile.id ? { ...file, ...nextFile } : file,
              );
        onFilesChange?.(nextFiles);
        return nextFiles;
      });
    },
    [onFilesChange],
  );

  useEffect(() => {
    if (!roomId || !username) return;

    socket.auth = { token: localStorage.getItem("token") || "" };

    const emitJoin = () => {
      const key = `${socket.id}:${roomId}`;
      if (lastJoinKeyRef.current === key) return;
      socket.emit(ACTIONS.JOIN, { roomId, username });
      lastJoinKeyRef.current = key;
    };

    if (socket.connected) {
      emitJoin();
    } else {
      socket.once("connect", emitJoin);
      socket.connect();
    }

    const onJoined = ({
      clients: joinedClients,
      username: joinedName,
      socketId: newSocketId,
    }) => {
      onClientsChange?.(joinedClients ?? []);
      if (joinedName && newSocketId) {
        if (socket.id === newSocketId) {
          sysToastInfo("Session linked to room node");
        } else {
          sysToastInfo(`Node joined: ${joinedName}`, {
            id: `join-${newSocketId}`,
          });
        }
      }
    };

    const onFilesState = ({
      files: initialFiles,
      activeFileId: nextActiveId,
      maxFiles: max,
      isAdmin: admin,
      presence,
    }) => {
      const safeFiles = Array.isArray(initialFiles) ? initialFiles : [];
      setFiles(safeFiles);
      onFilesChange?.(safeFiles);
      setActiveFileId(nextActiveId || safeFiles[0]?.id || "");
      setMaxFiles(Number.isFinite(max) ? max : 10);
      setAdminInRoom(Boolean(admin));
      setFilePresence(presence || {});
      onFilePresenceChange?.(presence || {});
    };

    const onFileCreated = ({ file }) => {
      if (!file?.id) return;
      upsertFile(file);
    };

    const onFileSwitched = ({ fileId }) => {
      if (!fileId) return;
      setActiveFileId(fileId);
      socket.currentFileId = fileId;
    };

    const onFilePresenceState = ({ presence }) => {
      setFilePresence(presence || {});
      onFilePresenceChange?.(presence || {});
    };

    const onFileCodeChange = ({ fileId, code, language }) => {
      if (!fileId) return;
      setFiles((prev) => {
        const nextFiles = prev.map((f) =>
          f.id === fileId
            ? { ...f, code: code ?? "", language: language || f.language }
            : f,
        );
        onFilesChange?.(nextFiles);
        return nextFiles;
      });
    };

    const onFileRenamed = ({ fileId, name }) => {
      if (!fileId || !name) return;
      setFiles((prev) => {
        const nextFiles = prev.map((f) =>
          f.id === fileId ? { ...f, name } : f,
        );
        onFilesChange?.(nextFiles);
        return nextFiles;
      });
    };

    const onFileDeleted = ({ fileId, fallbackFileId }) => {
      if (!fileId) return;
      setFiles((prev) => {
        const nextFiles = prev.filter((f) => f.id !== fileId);
        onFilesChange?.(nextFiles);
        return nextFiles;
      });
      if (fallbackFileId) {
        setActiveFileId(fallbackFileId);
      }
    };

    const onFileError = ({ message }) => {
      if (message) toast.error(message);
    };

    const onDisconnected = ({ socketId, username: leftName, clients: nextClients }) => {
      if (Array.isArray(nextClients)) {
        onClientsChange?.(nextClients);
      } else {
        onClientsChange?.((prev) =>
          Array.isArray(prev)
            ? prev.filter((c) => c.socketId !== socketId)
            : [],
        );
      }
      if (leftName) toast(`${leftName} left`);
    };

    socket.on(ACTIONS.JOINED, onJoined);
    socket.on(ACTIONS.FILES_STATE, onFilesState);
    socket.on(ACTIONS.FILE_CREATED, onFileCreated);
    socket.on(ACTIONS.FILE_SWITCHED, onFileSwitched);
    socket.on(ACTIONS.FILE_PRESENCE_STATE, onFilePresenceState);
    socket.on(ACTIONS.FILE_CODE_CHANGE, onFileCodeChange);
    socket.on(ACTIONS.FILE_RENAMED, onFileRenamed);
    socket.on(ACTIONS.FILE_DELETED, onFileDeleted);
    socket.on(ACTIONS.FILE_ERROR, onFileError);
    socket.on(ACTIONS.DISCONNECTED, onDisconnected);

    return () => {
      socket.off(ACTIONS.JOINED, onJoined);
      socket.off(ACTIONS.FILES_STATE, onFilesState);
      socket.off(ACTIONS.FILE_CREATED, onFileCreated);
      socket.off(ACTIONS.FILE_SWITCHED, onFileSwitched);
      socket.off(ACTIONS.FILE_PRESENCE_STATE, onFilePresenceState);
      socket.off(ACTIONS.FILE_CODE_CHANGE, onFileCodeChange);
      socket.off(ACTIONS.FILE_RENAMED, onFileRenamed);
      socket.off(ACTIONS.FILE_DELETED, onFileDeleted);
      socket.off(ACTIONS.FILE_ERROR, onFileError);
      socket.off(ACTIONS.DISCONNECTED, onDisconnected);
    };
  }, [
    roomId,
    username,
    onClientsChange,
    onFilesChange,
    onFilePresenceChange,
    upsertFile,
  ]);

  const handleEditorChange = useCallback(
    (value) => {
      if (!activeFile.id) {
        return;
      }
      const next = value ?? "";
      setFiles((prev) =>
        prev.map((file) =>
          file.id === activeFile.id ? { ...file, code: next } : file,
        ),
      );
      socket.emit(ACTIONS.FILE_CODE_CHANGE, {
        roomId,
        fileId: activeFile.id,
        code: next,
        language: activeFile.language,
      });
    },
    [roomId, activeFile.id, activeFile.language],
  );

  const handleCreateFile = () => {
    if (files.length >= maxFiles) {
      toast.error(`You can create up to ${maxFiles} files`);
      return;
    }
    const nextName = window.prompt(
      "Enter file name",
      `file-${files.length + 1}.js`,
    );
    if (!nextName) return;
    socket.emit(ACTIONS.FILE_CREATE, {
      roomId,
      name: nextName,
      language: activeFile.language || "javascript",
    });
  };

  const handleSwitchFile = (fileId) => {
    if (!fileId) return;
    setActiveFileId(fileId);
    socket.emit(ACTIONS.FILE_SWITCH, { roomId, fileId });
  };

  const handleRenameFile = () => {
    if (!adminInRoom || !activeFile.id) {
      toast.error("Only room admin can rename files");
      return;
    }
    const nextName = window.prompt("Rename file", activeFile.name);
    if (!nextName || nextName === activeFile.name) return;
    socket.emit(ACTIONS.FILE_RENAME, {
      roomId,
      fileId: activeFile.id,
      name: nextName,
    });
  };

  const handleDeleteFile = () => {
    if (!adminInRoom || !activeFile.id) {
      toast.error("Only room admin can delete files");
      return;
    }
    if (!window.confirm(`Delete ${activeFile.name}?`)) return;
    socket.emit(ACTIONS.FILE_DELETE, {
      roomId,
      fileId: activeFile.id,
    });
  };

  const handleLanguageChange = (value) => {
    if (!activeFile.id) return;
    setFiles((prev) =>
      prev.map((file) =>
        file.id === activeFile.id ? { ...file, language: value } : file,
      ),
    );
    socket.emit(ACTIONS.FILE_CODE_CHANGE, {
      roomId,
      fileId: activeFile.id,
      code: activeFile.code,
      language: value,
    });
  };

  const runCode = async () => {
    setRunning(true);
    setOutput("");
    setOutputOpen(true);
    const startMs = performance.now();

    try {
      const { data } = await API.post("/compile", {
        code: activeFile.code,
        language: lang.jdoodle,
      });
      const duration = formatDurationMs(startMs);
      const joined = [data.stdout, data.stderr].filter(Boolean).join("\n");
      const text = data.output ?? (joined || "(no output)");
      const stamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const exitCode =
        data.statusCode && data.statusCode !== 200 ? data.statusCode : 0;
      const success = exitCode === 0;
      const header = formatSystemHeader({ success, exitCode, duration });
      const body =
        typeof text === "string" ? text : JSON.stringify(data, null, 2);

      lastRunAtRef.current = stamp;
      setOutput(`${header}\n${formatStdoutLine(stamp, body)}`);

      if (success) {
        sysToastSuccess("Process Completed:", { exitCode, duration });
      } else {
        sysToastError("Execution stream returned errors", {
          exitCode,
          duration,
        });
      }
    } catch (e) {
      const duration = formatDurationMs(startMs);
      const msg =
        e.response?.data?.error ||
        e.message ||
        "Could not reach the server. Check that the backend is running.";
      const stamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setOutput(formatSystemError(stamp, String(msg), 1, duration));
      sysToastError("Core execution stream failed", { exitCode: 1, duration });
    } finally {
      setRunning(false);
    }
  };

  const connectedCount = clients.length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--cj-bg)]">
      {/* Top header navigation */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cj-border)] bg-[var(--cj-panel)] px-4 py-3">
        <p className="cj-mono text-xs tracking-wider text-[var(--cj-muted)]">
          <span className="font-semibold text-[var(--cj-text)]">[ ROOM ]</span>{" "}
          <span className="font-bold text-[var(--cj-success)]">{roomId}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCreateFile}
            className="cj-btn cj-btn-outline px-3 py-2"
          >
            + New
          </button>
          <button
            type="button"
            onClick={handleRenameFile}
            disabled={!adminInRoom || !activeFile.id}
            className="cj-btn cj-btn-outline inline-flex items-center gap-1.5 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconPencil /> Rename
          </button>
          <button
            type="button"
            onClick={handleDeleteFile}
            disabled={!adminInRoom || !activeFile.id}
            className="cj-btn cj-btn-danger-outline inline-flex items-center gap-1.5 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconTrash /> Delete
          </button>
          <label className="sr-only" htmlFor="lang-select">
            Language
          </label>
          <select
            id="lang-select"
            value={activeFile.language || "javascript"}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="cj-select cj-select-pill px-3 py-2"
          >
            {LANG_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={runCode}
            disabled={running}
            className="cj-btn cj-btn-run inline-flex items-center gap-2 px-5 py-2"
          >
            <span className="cj-prompt">&gt;_</span>
            {running ? "Executing…" : "Run"}
          </button>
        </div>
      </header>

      {/* Workspace: tabs + editor + console */}
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-3">
        {/* File tabs — top radius only */}
        <div className="flex items-end gap-0.5 overflow-x-auto px-1">
          {files.map((file) => (
            <button
              key={file.id}
              type="button"
              onClick={() => handleSwitchFile(file.id)}
              className={`cj-file-tab shrink-0 ${
                file.id === activeFile.id ? "cj-file-tab-active" : ""
              }`}
            >
              {file.name}
            </button>
          ))}
          {files.length === 0 && (
            <p className="px-2 pb-2 text-xs font-normal text-[var(--cj-muted)]">
              No files yet. Create one to start coding.
            </p>
          )}
        </div>

        {/* Editor frame */}
        <div
          className={`cj-editor-shell flex min-h-0 flex-col ${
            outputOpen ? "flex-[3]" : "flex-1"
          }`}
        >
          <div className="min-h-[180px] flex-1">
            <Editor
            height="100%"
            language={lang.monaco}
            theme="codejam-dark"
            value={activeFile.code}
            onChange={handleEditorChange}
            beforeMount={setupCodeJamMonacoTheme}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "JetBrains Mono, Fira Code, monospace",
              fontLigatures: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              padding: { top: 16, bottom: 16 },
              lineNumbersMinChars: 3,
              renderLineHighlight: "line",
              smoothScrolling: true,
            }}
          />
          </div>
        </div>

        {/* Bottom console */}
        <div
          className={`cj-console-shell mt-3 flex min-h-0 flex-col transition-[flex] ${
            outputOpen ? "flex-[2]" : "shrink-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[var(--cj-border-dim)] px-4 py-2">
            <p className="cj-label">&gt; OUTPUT_STREAM</p>
            <button
              type="button"
              onClick={() => setOutputOpen((v) => !v)}
              className="px-2 py-0.5 text-xs text-[var(--cj-muted)] hover:border hover:border-[var(--cj-border-dim)]"
              aria-label={outputOpen ? "Collapse output" : "Expand output"}
            >
              {outputOpen ? "[ - ]" : "[ + ]"}
            </button>
          </div>
          {outputOpen && (
            <pre className="cj-mono cj-scrollbar flex-1 overflow-auto p-4 text-xs leading-relaxed text-[var(--cj-text-secondary)] whitespace-pre-wrap">
              {output || "[SYSTEM]: AWAITING_EXECUTION (IDLE)"}
            </pre>
          )}
        </div>
      </div>

      {/* Status bar */}
      <footer className="flex items-center justify-between border-t border-[var(--cj-border-dim)] bg-[var(--cj-panel)] px-4 py-2 text-xs text-[var(--cj-muted)]">
        <span className="cj-mono">
          {formatStatusBar({ connected: connectedCount, ready: !running })}
        </span>
        <span className="text-[var(--cj-muted)]" aria-hidden>
          &gt;_
        </span>
      </footer>
    </div>
  );
}
