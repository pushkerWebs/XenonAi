import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import aiLogo from "../../logo/nexus.ai.svg"

export default function SplashScreen({ onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Show for 2.8s then fade out and notify parent
    const exit = setTimeout(() => setVisible(false), 2800)
    return () => clearTimeout(exit)
  }, [])

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#090909",
            gap: 28,
          }}
        >
          {/* Logo — gentle breathe */}
          <motion.img
            src={aiLogo}
            alt="Xenon AI"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{
              opacity: 1,
              scale: [0.88, 1, 0.97, 1],
            }}
            transition={{
              opacity: { duration: 0.6, ease: "easeOut" },
              scale: { duration: 1.8, ease: "easeInOut", times: [0, 0.4, 0.7, 1] },
            }}
            style={{ width: 80, height: 80 }}
          />

          {/* Brand name — letters slide up one by one */}
          <motion.div
            style={{
              fontFamily: "'Michroma', sans-serif",
              fontSize: 22,
              letterSpacing: "0.28em",
              color: "#fff",
              display: "flex",
              gap: 0,
            }}
          >
            {"XENON AI".split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.35 + i * 0.055,
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{ display: "inline-block", whiteSpace: "pre" }}
              >
                {char}
              </motion.span>
            ))}
          </motion.div>

          {/* Loading bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            style={{
              width: 160,
              height: 2,
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{
                delay: 0.9,
                duration: 1.6,
                ease: [0.4, 0, 0.2, 1],
              }}
              style={{
                height: "100%",
                width: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
