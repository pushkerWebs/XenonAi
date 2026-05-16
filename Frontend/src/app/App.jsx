import { RouterProvider } from "react-router"
import { router } from "./app.routes"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "../features/auth/hooks/useAuth"
import { motion, AnimatePresence } from "framer-motion"
import SplashScreen from "./SplashScreen"


function App() {

  const { handleGetMe } = useAuth()
  const [showSplash, setShowSplash] = useState(false)

  // Always verify session on app start — even if localStorage has a user.
  // This ensures stale/expired cookies are caught and the user is not
  // stuck in a "logged in but all API calls fail" state.
  useEffect(() => {
    handleGetMe()
  }, [handleGetMe])

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem("xenonSplashSeen") === "1"
    if (!hasSeenSplash) {
      setShowSplash(true)
    }
  }, [])

  const handleSplashDone = useCallback(() => {
    setShowSplash(false)
    sessionStorage.setItem("xenonSplashSeen", "1")
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