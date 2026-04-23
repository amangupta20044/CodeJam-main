import { useState } from "react";
import toast from "react-hot-toast";

export default function RoomInfo({ roomId }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      toast.success("Room ID copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="">
      <h2 className="text-sm font-semibold text-slate-300">Room ID</h2>
      <p className="mb-3 break-all font-mono text-sm text-emerald-400/90">
        {roomId}
      </p>
      <button
        type="button"
        onClick={copy}
        className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 cursor-pointer"
      >
        {copied ? "Copied" : "Copy room ID"}
      </button>
    </div>
  );
}
