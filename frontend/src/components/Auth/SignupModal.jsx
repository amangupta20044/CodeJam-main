import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { signupUser } from "../../services/auth";
import { getApiErrorMessage } from "../../services/api";

export default function SignupModal({ open, setOpen, onSwitchToLogin }) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  if (!open) return null;

  const handleSignup = async (e) => {
    e.preventDefault();
    const username = form.username.trim();
    const email = form.email.trim();
    const password = form.password;

    if (!username || !email || !password) {
      toast.error("All fields are required");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await signupUser({ username, email, password });
      const { token, user } = res.data ?? {};
      if (!token || !user) {
        toast.error("Unexpected response from server");
        return;
      }
      login({ token, user });
      toast.success("Account created — you're signed in");
      setForm({ username: "", email: "", password: "" });
      setOpen(false);
    } catch (err) {
      const msg = getApiErrorMessage(err, "Sign up failed");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[400px] border border-[var(--cj-border)] bg-[var(--cj-panel)] shadow-[var(--cj-shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--cj-border)] px-6 py-4">
          <p className="cj-label mb-1">Registration</p>
          <h2
            id="signup-title"
            className="cj-mono text-lg font-semibold tracking-wide text-[var(--cj-text)]"
          >
            [ SIGN UP ]
          </h2>
          <p className="mt-1 text-xs text-[var(--cj-muted)]">
            Create a node profile for collaborative sessions
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4 px-6 py-5">
          <div>
            <label htmlFor="signup-username" className="cj-label mb-1.5 block">
              Display name
            </label>
            <input
              id="signup-username"
              type="text"
              autoComplete="username"
              placeholder="How others see you in rooms"
              className="cj-input w-full px-4 py-3 text-[var(--cj-text)] placeholder:text-[var(--cj-muted)]"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="signup-email" className="cj-label mb-1.5 block">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="cj-input w-full px-4 py-3 text-[var(--cj-text)] placeholder:text-[var(--cj-muted)]"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="cj-label mb-1.5 block">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              placeholder="Minimum 6 characters"
              className="cj-input w-full px-4 py-3 text-[var(--cj-text)] placeholder:text-[var(--cj-muted)]"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cj-btn cj-btn-run flex w-full items-center justify-center gap-2 py-3 text-sm normal-case tracking-normal"
          >
            {/* <span className="font-bold">&gt;_</span> */}
            {loading ? "Provisioning…" : "Create account"}
          </button>
        </form>

        <div className="border-t border-[var(--cj-border)] px-6 py-4">
          {onSwitchToLogin ? (
            <p className="text-center text-sm  text-[var(--cj-muted)]">
              Already have an account?{" "}
              <button
                type="button"
                className="font-medium cursor-pointer text-[var(--cj-success)] hover:underline"
                onClick={() => {
                  setOpen(false);
                  onSwitchToLogin();
                }}
              >
                Log in
              </button>
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="cj-btn cj-btn-outline mt-3 w-full py-2 text-xs normal-case tracking-normal text-[var(--cj-text-secondary)]"
          >
             Close
          </button>
        </div>
      </div>
    </div>
  );
}
