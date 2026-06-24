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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--cj-bg)] px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]"
        aria-hidden
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--cj-text)]">
            CodeJam
          </h1>
          <p className="mt-2 text-sm text-[var(--cj-muted)]">
            Collaborative IDE — zinc / slate / indigo
          </p>
        </div>

        <div className="border border-[var(--cj-border)] bg-[var(--cj-panel)] p-8 shadow-[var(--cj-shadow-md)]">
          <label className="cj-label mb-1.5 block">Room ID</label>
          <input
            placeholder="e.g. abc12345"
            className="cj-input mb-4 w-full px-4 py-3 text-[var(--cj-text)] placeholder:text-[var(--cj-muted)]"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            autoComplete="off"
          />

          <label className="cj-label mb-1.5 block">Your name</label>
          <input
            placeholder="How others see you"
            className="cj-input mb-6 w-full px-4 py-3 text-[var(--cj-text)] placeholder:text-[var(--cj-muted)]"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            onKeyDown={(e) => e.key === "Enter" && joinRoom()}
          />

          <button
            type="button"
            onClick={joinRoom}
            className="cj-btn cj-btn-run w-full py-3 text-sm"
          >
            Join room
          </button>

          <p className="mt-6 text-center text-sm text-[var(--cj-muted)]">
            No room yet?{" "}
            <button
              type="button"
              className="font-medium text-[var(--cj-accent)] underline-offset-2 hover:underline cursor-pointer"
              onClick={createRoom}
            >
              Create a new room
            </button>
          </p>

          {user ? (
            <div className="mt-8 space-y-3 border-t border-[var(--cj-border-soft)] pt-6">
              <p className="text-center text-sm text-[var(--cj-muted)]">
                Signed in as{" "}
                <span className="font-medium text-[var(--cj-accent)]">
                  {user.username}
                </span>
              </p>
              <button
                type="button"
                className="cj-btn cj-btn-outline w-full py-2.5 text-sm normal-case tracking-normal"
                onClick={() => {
                  logout();
                  toast.success("Logged out");
                }}
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="mt-8 flex gap-3 border-t border-[var(--cj-border-soft)] pt-6">
              <button
                type="button"
                className="cj-btn cj-btn-outline flex-1 py-2.5 text-sm normal-case tracking-normal"
                onClick={() => setLoginOpen(true)}
              >
                Log in
              </button>
              <button
                type="button"
                className="cj-btn cj-btn-outline flex-1 py-2.5 text-sm normal-case tracking-normal"
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
