import toast from "react-hot-toast";
import { formatSystemHeader } from "./systemLog";

const toastBase = {
  duration: 3200,
  icon: ">",
  style: {
    background: "#18181b",
    color: "#f4f4f5",
    border: "1px solid #27272a",
    borderRadius: "0",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: "11px",
    letterSpacing: "0.04em",
    maxWidth: "520px",
  },
};

export function sysToastSuccess(message, { exitCode = 0, duration = "0.00s" } = {}) {
  const header = formatSystemHeader({ success: true, exitCode, duration });
  toast.success(
    () => (
      <span className="font-mono tracking-wider">
        <span className="font-bold text-indigo-400">&gt;_</span>{" "}
        <span className="text-zinc-100">{message}</span>{" "}
        <span className="text-emerald-400">{header.split(": ")[1]}</span>
      </span>
    ),
    toastBase,
  );
}

export function sysToastError(message, { exitCode = 1, duration = "0.00s" } = {}) {
  toast.error(
    () => (
      <span className="font-mono tracking-wider text-red-400">
        <span className="font-bold text-zinc-100">[ FAILED ]</span> {message}{" "}
        <span className="text-red-300">EXT_{exitCode}</span>{" "}
        <span className="text-zinc-600">t={duration}</span>
      </span>
    ),
    {
      ...toastBase,
      icon: "!",
      style: {
        ...toastBase.style,
        color: "#fca5a5",
        border: "1px solid #7f1d1d",
      },
    },
  );
}

export function sysToastInfo(message, options = {}) {
  toast(
    () => (
      <span className="font-mono tracking-wider">
        <span className="font-bold text-zinc-300">[ INFO ]</span>{" "}
        <span className="text-zinc-400">{message}</span>
      </span>
    ),
    { ...toastBase, ...options },
  );
}
