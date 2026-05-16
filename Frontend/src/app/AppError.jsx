import React from 'react'
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'

const LogoMark = () => (
  <svg viewBox="0 0 32 32" width="18" height="18" fill="none">
    <rect x="2" y="2" width="28" height="28" rx="8" fill="#000000" stroke="#444" strokeWidth="1.5"/>
    <line x1="10" y1="10" x2="22" y2="22" stroke="#d4d4d4" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="22" y1="10" x2="10" y2="22" stroke="#d4d4d4" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
)

const AppError = () => {
  const error = useRouteError()
  const navigate = useNavigate()

  const status = isRouteErrorResponse(error) ? error.status : 500
  const title = isRouteErrorResponse(error)
    ? (error.statusText || 'Something went wrong')
    : 'Something went wrong'
  const message = isRouteErrorResponse(error)
    ? (error.data?.message || 'An unexpected routing error occurred.')
    : (error?.message || 'An unexpected application error occurred.')

  const isNotFound = status === 404

  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans bg-neutral-50 dark:bg-[#0f0f0f] text-neutral-900 dark:text-neutral-100">
      <div className="w-full max-w-[520px] bg-white dark:bg-[#161616] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-10 shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
        
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <LogoMark />
          <span className="font-michroma font-extrabold text-2xl tracking-tighter">Xenon</span>
        </div>

        {/* Status badge */}
        <div className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-full px-3 py-1.5 text-[0.72rem] font-semibold text-rose-700 dark:text-rose-500 tracking-widest uppercase mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          {isNotFound ? 'Page not found' : `Error ${status}`}
        </div>

        {/* Headline */}
        <h1 className="text-[clamp(1.6rem,4vw,2.1rem)] font-extrabold tracking-tight leading-tight mb-2.5">
          {isNotFound ? 'This page doesn\'t exist' : 'We hit a snag'}
        </h1>
        <p className="text-[0.9rem] text-neutral-500 dark:text-neutral-400 leading-relaxed mb-7">
          {isNotFound
            ? 'The page you\'re looking for may have moved or never existed. Your data is safe.'
            : 'Something went wrong while rendering this page. Your data is safe — try one of the options below.'}
        </p>

        {/* Error detail */}
        <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 mb-7">
          <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1.5">Error detail</p>
          <p className="text-[0.8rem] text-neutral-600 dark:text-neutral-400 font-mono break-words leading-relaxed m-0 whitespace-pre-wrap">
            {status} · {title}{'\n'}{String(message)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button 
            className="flex-1 min-w-[130px] px-4 py-3 rounded-xl border-none bg-gradient-to-br from-neutral-800 to-black text-neutral-50 text-[0.875rem] font-bold tracking-wide cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
            type="button" 
            onClick={() => navigate('/')}
          >
            {isNotFound ? 'Go to chat' : 'Back to chat'}
          </button>
          {!isNotFound && (
            <button 
              className="flex-1 min-w-[130px] px-4 py-3 rounded-xl border-[1.5px] border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-600 dark:text-neutral-300 text-[0.875rem] font-semibold tracking-wide cursor-pointer transition-all hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-500 active:scale-[0.98]"
              type="button" 
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          )}
        </div>

        <p className="mt-8 text-center text-[0.72rem] text-neutral-400 dark:text-neutral-600 tracking-wide">
          XENON · All your data is safe and intact
        </p>
      </div>
    </div>
  )
}

export default AppError
