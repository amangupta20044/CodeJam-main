import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import LoginModal from "../components/Auth/LoginModal";
import SignupModal from "../components/Auth/SignupModal";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (user?.username) {
      setUsername((prev) => (prev.trim() ? prev : user.username));
    }
  }, [user]);

  const createRoom = async () => {
    if (!user) {
      toast.error("Please log in to create a room.");
      setLoginOpen(true);
      return;
    }

    try {
      const { data } = await API.post("/api/rooms", {});
      setRoomId(data.roomId);
      toast.success(`New room created: ${data.roomId}`, { duration: 4000 });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create room");
    }
  };

  const joinRoom = () => {
    const trimmedRoom = roomId.trim();
    const trimmedName = username.trim();
    if (!trimmedRoom || !trimmedName) {
      toast.error("Enter both a room ID and your name.");
      return;
    }
    navigate(`/room/${trimmedRoom}`, { state: { username: trimmedName } });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.15),transparent)]"
        aria-hidden
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            CodeJam
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Real-time collaborative coding with Socket.IO & Monaco
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-black/40 backdrop-blur">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Room ID
          </label>
          <input
            placeholder="e.g. abc12345"
            className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none ring-emerald-500/30 focus:border-emerald-600 focus:ring-2"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            autoComplete="off"
          />

          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Your name
          </label>
          <input
            placeholder="How others see you"
            className="mb-6 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none ring-emerald-500/30 focus:border-emerald-600 focus:ring-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            onKeyDown={(e) => e.key === "Enter" && joinRoom()}
          />

          <button
            type="button"
            onClick={joinRoom}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 cursor-pointer"
          >
            Join room
          </button>

          <p className="mt-6 text-center text-sm text-slate-500">
            No room yet?{" "}
            <button
              type="button"
              className="font-medium text-emerald-400 underline-offset-2 hover:underline cursor-pointer"
              onClick={createRoom}
            >
              Create a new room
            </button>
          </p>

          {user ? (
            <div className="mt-8 space-y-3 border-t border-slate-800 pt-6">
              <p className="text-center text-sm text-slate-400">
                Signed in as{" "}
                <span className="font-medium text-emerald-400">
                  {user.username}
                </span>
              </p>
              <button
                type="button"
                className="w-full rounded-lg border border-slate-600 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800 cursor-pointer"
                onClick={() => {
                  logout();
                  toast.success("Logged out");
                }}
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="mt-8 flex gap-3 border-t border-slate-800 pt-6">
              <button
                type="button"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 py-2.5 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 cursor-pointer"
                onClick={() => setLoginOpen(true)}
              >
                Log in
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 py-2.5 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 cursor-pointer"
                onClick={() => setSignupOpen(true)}
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </div>

      <LoginModal
        open={loginOpen}
        setOpen={setLoginOpen}
        onSwitchToSignup={() => setSignupOpen(true)}
      />
      <SignupModal
        open={signupOpen}
        setOpen={setSignupOpen}
        onSwitchToLogin={() => setLoginOpen(true)}
      />
    </div>
  );
}
