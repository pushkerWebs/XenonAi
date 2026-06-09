import React from 'react'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router'
import LoadingScreen from '../../../app/LoadingScreen'

const Protected = ({ children }) => {
  const user = useSelector(state => state.auth.user)
  const loading = useSelector(state => state.auth.loading)
  const isLoggingOut = useSelector(state => state.auth.isLoggingOut)

  // Logout in progress — show branded loading screen instead of white flash
  if (isLoggingOut) {
    return <LoadingScreen message="Signing out…" />
  }

  // Initial session check (page refresh / first load) — show branded screen
  // instead of the raw black-background CSS spinner that was here before
  if (loading) {
    return <LoadingScreen message="Checking session…" />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default Protected
