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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[380px] rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="login-title" className="mb-6 text-xl font-semibold text-white">
          Log in
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="sr-only">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="Email"
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="login-password" className="sr-only">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>

        {onSwitchToSignup ? (
          <p className="mt-4 text-center text-sm text-slate-400">
            No account?{" "}
            <button
              type="button"
              className="font-medium text-emerald-400 hover:underline"
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
          className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-300"
        >
          Close
        </button>
      </div>
    </div>
  );
}
