"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

export function FixedScrollMouse() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const curtain = document.querySelector<HTMLElement>("[data-footer-curtain]")
      const doc = document.documentElement
      const nearBottom =
        window.scrollY + window.innerHeight > doc.scrollHeight - window.innerHeight * 0.4
      let hideNow = nearBottom
      if (curtain) {
        const r = curtain.getBoundingClientRect()
        hideNow = hideNow || r.top < window.innerHeight * 0.7
      }
      setHidden(hideNow)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: hidden ? 0 : 1, y: hidden ? 16 : 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-none fixed inset-x-0 bottom-6 z-40 hidden justify-center sm:flex sm:bottom-8"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="relative flex h-[34px] w-[22px] items-start justify-center rounded-full border border-foreground/40 pt-1.5">
          <motion.span
            animate={{ y: [0, 10, 0], opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="block h-1.5 w-[2px] rounded-full bg-foreground/80"
          />
        </div>
      </div>
    </motion.div>
  )
}
