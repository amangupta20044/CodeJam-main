import Editor from "@monaco-editor/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ACTIONS } from "../../constants/actions";
import { socket } from "../../services/socket";
import API from "../../services/api";

const LANG_OPTIONS = [
  {
    id: "javascript",
    label: "JavaScript",
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

export default function CodeEditor({
  roomId,
  username,
  isAdmin,
  onClientsChange,
  onFilesChange,
  onFilePresenceChange,
}) {
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState("");
  const [filePresence, setFilePresence] = useState({});
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [maxFiles, setMaxFiles] = useState(10);
  const [adminInRoom, setAdminInRoom] = useState(Boolean(isAdmin));
  const lastJoinKeyRef = useRef(null);

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
      // Attach handler before calling connect() to avoid missing the event.
      socket.once("connect", emitJoin);
      socket.connect();
    }

    const onJoined = ({
      clients,
      username: joinedName,
      socketId: newSocketId,
    }) => {
      onClientsChange?.(clients ?? []);
      if (joinedName && newSocketId) {
        if (socket.id === newSocketId) {
          toast.success("You joined the room");
        } else {
          toast.success(`${joinedName} joined`, { id: `join-${newSocketId}` });
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

    const onDisconnected = ({ socketId, username: leftName, clients }) => {
      if (Array.isArray(clients)) {
        onClientsChange?.(clients);
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
      // Don't disconnect here: React StrictMode can unmount/mount quickly.
      // RoomSidebar handles disconnect on explicit "Leave room".
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
    try {
      const { data } = await API.post("/compile", {
        code: activeFile.code,
        language: lang.jdoodle,
      });
      const joined = [data.stdout, data.stderr].filter(Boolean).join("\n");
      const text = data.output ?? (joined || "(no output)");
      setOutput(
        typeof text === "string" ? text : JSON.stringify(data, null, 2),
      );
      if (data.statusCode && data.statusCode !== 200) {
        toast.error("Run finished with errors");
      } else {
        toast.success("Run completed");
      }
    } catch (e) {
      const msg =
        e.response?.data?.error ||
        e.message ||
        "Could not reach the server. Is the backend running on port 5000?";
      setOutput(String(msg));
      toast.error("Run failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Room
          </p>
          <p className="font-mono text-sm text-emerald-400">{roomId}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCreateFile}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            + New file
          </button>
          <button
            type="button"
            onClick={handleRenameFile}
            disabled={!adminInRoom || !activeFile.id}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={handleDeleteFile}
            disabled={!adminInRoom || !activeFile.id}
            className="rounded-lg border border-red-700 bg-red-900/50 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete
          </button>
          <label className="sr-only" htmlFor="lang-select">
            Language
          </label>
          <select
            id="lang-select"
            value={activeFile.language || "javascript"}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/50"
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
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? "Running…" : "Run code"}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900/60 px-3 py-2">
        {files.map((file) => {
          const workingUsers = filePresence?.[file.id] || [];
          const workingNames = workingUsers.map(
            (u) => u.username || "Anonymous",
          );

          return (
            <button
              key={file.id}
              type="button"
              onClick={() => handleSwitchFile(file.id)}
              className={`rounded-lg px-3 py-1.5 text-left text-xs font-medium transition ${
                file.id === activeFile.id
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <span className="block max-w-40 truncate">{file.name}</span>
              <span className="mt-1 block max-w-40 truncate text-[10px] text-emerald-200/80">
                {workingNames.slice(0, 2).join(", ") || "No one here"}
                {workingNames.length > 2 ? ` +${workingNames.length - 2}` : ""}
              </span>
            </button>
          );
        })}
        {files.length === 0 && (
          <p className="text-xs text-slate-500">
            No files yet. Create one to start coding.
          </p>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-60 min-w-0 flex-1 lg:min-h-0">
          <Editor
            height="100%"
            language={lang.monaco}
            theme="vs-dark"
            value={activeFile.code}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        </div>
        <aside className="flex max-h-[40vh] min-h-35 flex-col border-t border-slate-800 bg-slate-900 lg:max-h-none lg:w-[min(100%,380px)] lg:border-l lg:border-t-0">
          <div className="border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Output
          </div>
          <pre className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
            {output || "Run your code to see output here."}
          </pre>
        </aside>
      </div>
    </div>
  );
}
