import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSelector } from 'react-redux'
import { useAuth } from '../hooks/useAuth'

function EyeOpenIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeClosedIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-4.1 5.1" />
      <path d="M6.2 6.2C3.6 8 2 12 2 12s3.5 7 10 7c1.1 0 2.1-.2 3-.5" />
    </svg>
  )
}

const LogoMark = () => (
  <svg viewBox="0 0 32 32" width="32" height="32" fill="none">
    <rect x="2" y="2" width="28" height="28" rx="8" fill="#000000" stroke="#444" strokeWidth="1.5" />
    <line x1="10" y1="10" x2="22" y2="22" stroke="#d4d4d4" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="22" y1="10" x2="10" y2="22" stroke="#d4d4d4" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
)

const FEATURES = [
  {
    icon: '⚡',
    title: 'Real-time search',
    desc: 'Instant answers from the live web.',
  },
  {
    icon: '📄',
    title: 'Multi-document analysis',
    desc: 'Upload up to 3 PDFs or images per message. Context that scales.',
  },
  {
    icon: '🔒',
    title: 'Private by design',
    desc: 'Your conversations stay yours. No training on your data.',
  },
]

const Register = () => {
  const navigate = useNavigate()
  const { handleRegister } = useAuth()
  const loading = useSelector(state => state.auth.loading)
  const error = useSelector(state => state.auth.error)

  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [isPasswordHidden, setIsPasswordHidden] = useState(true)

  const onSubmit = async (e) => {
    e.preventDefault()
    const isRegistered = await handleRegister(form)
    if (isRegistered) navigate('/login')
  }

  return (
    <div className="flex min-h-screen font-sans bg-neutral-50 dark:bg-[#0f0f0f]">
      {/* Left info panel - Make it look less AI, more SaaS/Tooling */}
      <div className="hidden lg:flex flex-[0_0_46%] bg-linear-to-br from-neutral-900 to-black p-10 flex-col justify-between overflow-hidden">
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="text-neutral-100 font-extrabold text-2xl tracking-tighter font-michroma">Xenon</span>
        </div>

        <div>
          <p className="text-[0.7rem] font-semibold tracking-widest uppercase text-amber-500/90 mb-2.5">Get started free</p>
          <h2 className="text-[clamp(1.8rem,2.6vw,2.5rem)] font-extrabold leading-tight text-neutral-100 tracking-tight mb-3">
            A smarter workspace.<br />
            For <span className="text-amber-500/90">better work.</span>
          </h2>
          <p className="text-[0.9rem] leading-relaxed text-neutral-400 max-w-85 mb-8">
            Xenon brings research, writing, and analysis into one place. Build better products, faster.
          </p>

          <div className="flex flex-col gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="flex gap-3 items-start">
                <span className="text-lg leading-none mt-0.5 shrink-0 bg-neutral-200 dark:bg-neutral-800 p-2 rounded-lg">{f.icon}</span>
                <div>
                  <p className="text-[0.85rem] font-bold text-neutral-800 dark:text-neutral-200 mb-0.5">{f.title}</p>
                  <p className="text-[0.78rem] text-neutral-600 dark:text-neutral-500 leading-relaxed m-0">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[0.7rem] text-neutral-500 tracking-wide m-0">No credit card required · Free to start</p>
      </div>

      {/* Right form side */}
      <div className="flex-1 flex items-center justify-center p-10 lg:p-6 overflow-y-auto dark:bg-[#0f0f0f]">
        <div className="w-full max-w-102.5">
          <h1 className="text-[1.7rem] font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 mb-1">Create account</h1>
          <p className="text-[0.85rem] text-neutral-500 dark:text-neutral-400 mb-7">Join thousands of people who work smarter with Xenon</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-username" className="text-[0.78rem] font-semibold text-neutral-700 dark:text-neutral-300 tracking-wide">Username</label>
              <input
                id="reg-username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                placeholder="yourname"
                className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] text-neutral-900 dark:text-neutral-100 text-[0.88rem] outline-none transition-all placeholder:text-neutral-400 focus:border-amber-500/90 focus:ring-[3px] focus:ring-amber-500/15"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-email" className="text-[0.78rem] font-semibold text-neutral-700 dark:text-neutral-300 tracking-wide">Email address</label>
              <input
                id="reg-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] text-neutral-900 dark:text-neutral-100 text-[0.88rem] outline-none transition-all placeholder:text-neutral-400 focus:border-amber-500/90 focus:ring-[3px] focus:ring-amber-500/15"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-password" className="text-[0.78rem] font-semibold text-neutral-700 dark:text-neutral-300 tracking-wide">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  name="password"
                  type={isPasswordHidden ? 'password' : 'text'}
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-11 rounded-xl border-[1.5px] border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] text-neutral-900 dark:text-neutral-100 text-[0.88rem] outline-none transition-all placeholder:text-neutral-400 focus:border-amber-500/90 focus:ring-[3px] focus:ring-amber-500/15"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 bg-transparent border-none p-0 flex items-center cursor-pointer"
                  onClick={() => setIsPasswordHidden(v => !v)}
                  aria-label={isPasswordHidden ? 'Show password' : 'Hide password'}
                >
                  {isPasswordHidden
                    ? <EyeClosedIcon className="w-4.25 h-4.25" />
                    : <EyeOpenIcon className="w-4.25 h-4.25" />}
                </button>
              </div>
              <p className="text-[0.72rem] text-neutral-500 mt-0.5 mb-0">Use 8+ characters with a mix of letters and numbers</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 px-3 py-3 rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-100 text-[0.9rem] font-bold tracking-wide cursor-pointer shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>

            {error && <p className="text-[0.8rem] text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-[#1a0a08] border border-rose-200 dark:border-rose-900/50 rounded-lg px-3 py-2 mt-2" role="alert">{error}</p>}
          </form>

          <div className="mt-8 text-center flex flex-col items-center gap-2">
            <p className="text-[0.85rem] text-neutral-500 dark:text-neutral-400 m-0">
              Already have an account?
            </p>
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800 text-sm font-semibold transition-colors no-underline shadow-sm block"
            >
              Sign in to Xenon
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
