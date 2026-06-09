import { RouterProvider } from "react-router"
import { router } from "./app.routes"
import { useEffect, useCallback } from "react"
import { useAuth } from "../features/auth/hooks/useAuth"
import { motion, AnimatePresence } from "framer-motion"
import SplashScreen from "./SplashScreen"
import { useState } from "react"


function App() {

  const { handleGetMe } = useAuth()

  // Show the branded splash on every page load / visit.
  // Previously this was gated by sessionStorage so it only played once —
  // now it always plays, matching the user's intent.
  const [showSplash, setShowSplash] = useState(true)

  // Always verify session on app start — even if localStorage has a user.
  // This ensures stale/expired cookies are caught and the user is not
  // stuck in a "logged in but all API calls fail" state.
  useEffect(() => {
    handleGetMe()
  }, [handleGetMe])

  const handleSplashDone = useCallback(() => {
    setShowSplash(false)
  }, [])

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" onDone={handleSplashDone} />
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <RouterProvider router={router} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default App