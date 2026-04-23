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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[380px] rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="signup-title" className="mb-6 text-xl font-semibold text-white">
          Create account
        </h2>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="signup-username" className="sr-only">
              Display name
            </label>
            <input
              id="signup-username"
              type="text"
              autoComplete="username"
              placeholder="Display name (used in rooms)"
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="signup-email" className="sr-only">
              Email
            </label>
            <input
              id="signup-email"
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
            <label htmlFor="signup-password" className="sr-only">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              placeholder="Password (min. 6 characters)"
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
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>

        {onSwitchToLogin ? (
          <p className="mt-4 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <button
              type="button"
              className="font-medium text-emerald-400 hover:underline"
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
          className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-300"
        >
          Close
        </button>
      </div>
    </div>
  );
}
