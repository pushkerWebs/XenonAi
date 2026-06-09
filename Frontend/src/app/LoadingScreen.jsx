import { motion } from "framer-motion"
import aiLogo from "../../logo/nexus.ai.svg"

/**
 * Branded full-screen loading screen.
 * Stays visible until the parent unmounts it — no auto-dismiss timer.
 * Used for: auth checks, logout transitions, session restore.
 *
 * @param {string} message  Optional subtitle shown under the progress bar
 */
export default function LoadingScreen({ message = "" }) {
  return (
    <motion.div
      key="loading-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
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
      {/* Logo */}
      <motion.img
        src={aiLogo}
        alt="Xenon AI"
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: [0.88, 1, 0.97, 1] }}
        transition={{
          opacity: { duration: 0.5, ease: "easeOut" },
          scale: { duration: 1.6, ease: "easeInOut", times: [0, 0.4, 0.7, 1] },
        }}
        style={{ width: 72, height: 72 }}
      />

      {/* Brand name — staggered letter reveal */}
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
              delay: 0.25 + i * 0.055,
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ display: "inline-block", whiteSpace: "pre" }}
          >
            {char}
          </motion.span>
        ))}
      </motion.div>

      {/* Looping shimmer progress bar — stays active until parent unmounts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        style={{
          width: 160,
          height: 2,
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{
            repeat: Infinity,
            duration: 1.4,
            ease: "easeInOut",
            delay: 0.7,
          }}
          style={{
            height: "100%",
            width: "100%",
            borderRadius: 999,
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
          }}
        />
      </motion.div>

      {/* Optional context message */}
      {message ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            color: "#fff",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          {message}
        </motion.p>
      ) : null}
    </motion.div>
  )
}
