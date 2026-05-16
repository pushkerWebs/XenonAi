import React, { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router'
import { useAuth } from '../hooks/useAuth.js'
import { useSelector } from 'react-redux'
import GoogleLogin from './GoogleLogin.jsx'

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

const testimonials = [
  { quote: "Xenon completely changed how I research. It's fast, accurate, and genuinely useful.", name: "Priya S.", role: "Content Strategist" },
  { quote: "The multi-document support alone saved me hours every single week.", name: "Arjun M.", role: "Product Manager" },
  { quote: "I switched from three tools to just Xenon. It handles everything.", name: "Sofia K.", role: "Freelance Developer" },
]

const LogoMark = () => (
  <svg viewBox="0 0 32 32" width="32" height="32" fill="none">
    <rect x="2" y="2" width="28" height="28" rx="8" fill="#000000" stroke="#444" strokeWidth="1.5" />
    <line x1="10" y1="10" x2="22" y2="22" stroke="#d4d4d4" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="22" y1="10" x2="10" y2="22" stroke="#d4d4d4" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
)

const Login = () => {
  const user = useSelector(state => state.auth.user)
  const loading = useSelector(state => state.auth.loading)
  const [form, setForm] = useState({ email: '', password: '' })
  const [isPasswordHidden, setIsPasswordHidden] = useState(true)
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const { handleLogin } = useAuth()
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    const isLoggedIn = await handleLogin({ email: form.email, password: form.password })
    if (isLoggedIn) navigate('/')
  }

  if (!loading && user) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-screen font-sans bg-neutral-50 dark:bg-[#0f0f0f]">
      {/* Left panel */}
      <div className="hidden lg:flex flex-[0_0_46%] bg-gradient-to-br from-neutral-900 to-black p-10 flex-col justify-between overflow-hidden">
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="text-neutral-100 font-extrabold text-2xl tracking-tighter font-michroma">Xenon</span>
        </div>

        <div>
          <p className="text-[0.7rem] font-semibold tracking-widest uppercase text-amber-500/90 mb-2.5">Welcome back</p>
          <h2 className="text-[clamp(1.85rem,2.8vw,2.6rem)] font-extrabold leading-tight text-neutral-100 tracking-tight mb-4">
            Your intelligence,<br />
            <span className="text-amber-500/90">always on.</span>
          </h2>
          <p className="text-[0.9rem] leading-relaxed text-neutral-400 max-w-[340px] m-0">
            Pick up right where you left off. Your conversations, documents, and context  all here, ready when you are.
          </p>
         
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <p className="text-[0.88rem] leading-relaxed text-neutral-300 italic mb-2.5">"{testimonials[activeTestimonial].quote}"</p>
          <p className="text-[0.75rem] text-neutral-500 m-0">
            — {testimonials[activeTestimonial].name},{' '}
            <span className="text-amber-500/90">{testimonials[activeTestimonial].role}</span>
          </p>
          <div className="flex gap-1.5 mt-3">
            {testimonials.map((_, i) => (
              <button
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 p-0 border-none cursor-pointer ${i === activeTestimonial ? 'bg-amber-500/90 w-4.5 rounded' : 'bg-neutral-700 w-1.5'}`}
                aria-label={`Testimonial ${i + 1}`}
                onClick={() => setActiveTestimonial(i)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right form side */}
      <div className="flex-1 flex items-center justify-center p-10 lg:p-6 dark:bg-[#0f0f0f]">
        <div className="w-full max-w-[410px]">
          <h1 className="text-[1.7rem] font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 mb-1">Sign in</h1>
          <p className="text-[0.85rem] text-neutral-500 dark:text-neutral-400 mb-2">Enter your credentials to continue</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-[0.78rem] font-semibold text-neutral-700 dark:text-neutral-300 tracking-wide">Email address</label>
              <input
                id="login-email"
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
              <div className="flex justify-between items-center">
                <label htmlFor="login-password" className="text-[0.78rem] font-semibold text-neutral-700 dark:text-neutral-300 tracking-wide">Password</label>
                <Link to="/forgot-password" className="text-[0.76rem] text-amber-600 dark:text-amber-500 font-medium hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={isPasswordHidden ? 'password' : 'text'}
                  autoComplete="current-password"
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
                    ? <EyeClosedIcon className="w-[17px] h-[17px]" />
                    : <EyeOpenIcon className="w-[17px] h-[17px]" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 px-3 py-3 rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-100 text-[0.9rem] font-bold tracking-wide cursor-pointer shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            <span className="text-[0.73rem] text-neutral-400 whitespace-nowrap">or continue with</span>
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
          </div>

          <div className="flex justify-center mb-5">
            <GoogleLogin />
          </div>

          <p className="text-center text-[0.83rem] text-neutral-500 dark:text-neutral-400 m-0 flex flex-col items-center gap-2">
            <span>Don&apos;t have an account?</span>
            <Link
              to="/register"
              className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800 text-sm font-semibold transition-colors no-underline shadow-sm block"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
