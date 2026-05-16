import React, { useState } from "react";
import { Link } from "react-router";
import { requestPasswordReset } from "../service/auth.api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const data = await requestPasswordReset({ email });
      setMessage(data.message || "Check your email for a reset link.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen font-sans bg-neutral-50 dark:bg-[#0f0f0f]">
      <div className="flex-1 flex items-center justify-center p-10 lg:p-6">
        <div className="w-full max-w-[420px]">
          <h1 className="text-[1.7rem] font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 mb-1">Forgot password</h1>
          <p className="text-[0.85rem] text-neutral-500 dark:text-neutral-400 mb-7">
            Enter your email and we will send a reset link.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="forgot-email" className="text-[0.78rem] font-semibold text-neutral-700 dark:text-neutral-300 tracking-wide">
                Email address
              </label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] text-neutral-900 dark:text-neutral-100 text-[0.88rem] outline-none transition-all placeholder:text-neutral-400 focus:border-amber-500/90 focus:ring-[3px] focus:ring-amber-500/15"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 px-3 py-3 rounded-xl border-none bg-gradient-to-br from-neutral-800 to-black text-neutral-50 text-[0.9rem] font-bold tracking-wide cursor-pointer transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? "Sending…" : "Send reset link"}
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

export default ForgotPassword;
