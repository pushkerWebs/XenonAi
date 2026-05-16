import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { resetPassword } from "../service/auth.api";

function EyeOpenIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosedIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-4.1 5.1" />
      <path d="M6.2 6.2C3.6 8 2 12 2 12s3.5 7 10 7c1.1 0 2.1-.2 3-.5" />
    </svg>
  );
}

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get("token"), [searchParams]);

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const [isConfirmHidden, setIsConfirmHidden] = useState(true);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const data = await resetPassword({
        token,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setMessage(data.message || "Password updated.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen font-sans bg-neutral-50 dark:bg-[#0f0f0f]">
        <div className="flex-1 flex items-center justify-center p-10 lg:p-6">
          <div className="w-full max-w-105 text-center">
            <h1 className="text-[1.6rem] font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 mb-2">Invalid reset link</h1>
            <p className="text-[0.85rem] text-neutral-500 dark:text-neutral-400 mb-6">
              The reset link is missing or expired. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="text-[0.8rem] text-amber-600 dark:text-amber-500 font-semibold hover:underline"
            >
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen font-sans bg-neutral-50 dark:bg-[#0f0f0f]">
      <div className="flex-1 flex items-center justify-center p-10 lg:p-6">
        <div className="w-full max-w-105">
          <h1 className="text-[1.7rem] font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 mb-1">Reset password</h1>
          <p className="text-[0.85rem] text-neutral-500 dark:text-neutral-400 mb-7">
            Choose a strong new password and confirm it.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-password" className="text-[0.78rem] font-semibold text-neutral-700 dark:text-neutral-300 tracking-wide">
                New password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  name="password"
                  type={isPasswordHidden ? "password" : "text"}
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-11 rounded-xl border-[1.5px] border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] text-neutral-900 dark:text-neutral-100 text-[0.88rem] outline-none transition-all placeholder:text-neutral-400 focus:border-amber-500/90 focus:ring-[3px] focus:ring-amber-500/15"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 bg-transparent border-none p-0 flex items-center cursor-pointer"
                  onClick={() => setIsPasswordHidden((v) => !v)}
                  aria-label={isPasswordHidden ? "Show password" : "Hide password"}
                >
                  {isPasswordHidden
                    ? <EyeClosedIcon className="w-4.25 h-4.25" />
                    : <EyeOpenIcon className="w-4.25 h-4.25" />}
                </button>
              </div>
              <p className="text-[0.72rem] text-neutral-500 mt-0.5 mb-0">Use 8+ characters with letters and numbers.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-password" className="text-[0.78rem] font-semibold text-neutral-700 dark:text-neutral-300 tracking-wide">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={isConfirmHidden ? "password" : "text"}
                  autoComplete="new-password"
                  required
                  value={form.confirmPassword}
                  onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-11 rounded-xl border-[1.5px] border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] text-neutral-900 dark:text-neutral-100 text-[0.88rem] outline-none transition-all placeholder:text-neutral-400 focus:border-amber-500/90 focus:ring-[3px] focus:ring-amber-500/15"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 bg-transparent border-none p-0 flex items-center cursor-pointer"
                  onClick={() => setIsConfirmHidden((v) => !v)}
                  aria-label={isConfirmHidden ? "Show password" : "Hide password"}
                >
                  {isConfirmHidden
                    ? <EyeClosedIcon className="w-4.25 h-4.25" />
                    : <EyeOpenIcon className="w-4.25 h-4.25" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 px-3 py-3 rounded-xl border-none bg-linear-to-br from-neutral-800 to-black text-neutral-50 text-[0.9rem] font-bold tracking-wide cursor-pointer transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? "Updating…" : "Update password"}
            </button>

            {message && (
              <p className="text-[0.8rem] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-[#0a1a12] border border-emerald-200 dark:border-emerald-900/50 rounded-lg px-3 py-2" role="status">
                {message}
              </p>
            )}

            {error && (
              <p className="text-[0.8rem] text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-[#1a0a08] border border-rose-200 dark:border-rose-900/50 rounded-lg px-3 py-2" role="alert">
                {error}
              </p>
            )}
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-[0.8rem] text-amber-600 dark:text-amber-500 font-semibold hover:underline"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
