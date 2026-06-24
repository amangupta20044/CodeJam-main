import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { loginUser } from "../../services/auth";
import { getApiErrorMessage } from "../../services/api";

export default function LoginModal({ open, setOpen, onSwitchToSignup }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  if (!open) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = form.email.trim();
    const password = form.password;
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser({ email, password });
      const { token, user } = res.data ?? {};
      if (!token || !user) {
        toast.error("Unexpected response from server");
        return;
      }
      login({ token, user });
      toast.success("Logged in successfully");
      setForm({ email: "", password: "" });
      setOpen(false);
    } catch (err) {
      const msg = getApiErrorMessage(err, "Login failed");
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
      aria-labelledby="login-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[400px] border border-[var(--cj-border)] bg-[var(--cj-panel)] shadow-[var(--cj-shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--cj-border)] px-6 py-4">
          <p className="cj-label mb-1">Authentication</p>
          <h2
            id="login-title"
            className="cj-mono text-lg font-semibold tracking-wide text-[var(--cj-text)]"
          >
            [ LOGIN ]
          </h2>
          <p className="mt-1 text-xs text-[var(--cj-muted)]">
            Access your CodeJam workspace
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 px-6 py-5">
          <div>
            <label htmlFor="login-email" className="cj-label mb-1.5 block">
              Email
            </label>
            <input
              id="login-email"
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
            <label htmlFor="login-password" className="cj-label mb-1.5 block">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
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
            <span className="font-bold">&gt;_</span>
            {loading ? "Authenticating…" : "Log in"}
          </button>
        </form>

        <div className="border-t border-[var(--cj-border)] px-6 py-4">
          {onSwitchToSignup ? (
            <p className="text-center text-sm text-[var(--cj-muted)]">
              No account?{" "}
              <button
                type="button"
                className="font-medium text-[var(--cj-success)] hover:underline"
                onClick={() => {
                  setOpen(false);
                  onSwitchToSignup();
                }}
              >
                Sign up
              </button>
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="cj-btn cj-btn-outline mt-3 w-full py-2 text-xs normal-case tracking-normal text-[var(--cj-text-secondary)]"
          >
            [ ESC ] Close
          </button>
        </div>
      </div>
    </div>
  );
}
