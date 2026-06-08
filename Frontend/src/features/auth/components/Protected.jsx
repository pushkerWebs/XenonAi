import React from 'react'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router'
import SplashScreen from '../../../app/SplashScreen'

const Protected = ({ children }) => {
  const user = useSelector(state => state.auth.user)
  const loading = useSelector(state => state.auth.loading)
  const isLoggingOut = useSelector(state => state.auth.isLoggingOut)

  // Logout in progress → show the same branded splash screen used at startup.
  // This replaces the blank white flash that appeared while the logout API
  // call was in-flight and Protected re-rendered with loading=true.
  if (isLoggingOut) {
    return <SplashScreen />
  }

  // Initial session check (page refresh / first load). Show a minimal dark
  // overlay that matches the app's colour scheme instead of a raw white div.
  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#090909',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: '3px solid rgba(255,255,255,0.08)',
            borderTopColor: 'rgba(255,255,255,0.55)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default Protected
