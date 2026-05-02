"use client"

import * as React from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export interface RevealImageItem {
  id: string
  label: string
  meta: string
  description: string
  image: string
}

export function RevealImageList({
  items,
  className,
}: {
  items: RevealImageItem[]
  className?: string
}) {
  const [active, setActive] = React.useState<string | null>(null)
  const [cursor, setCursor] = React.useState({ x: 0, y: 0 })
  const wrapRef = React.useRef<HTMLDivElement | null>(null)

  const onMove = (e: React.MouseEvent) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const r = wrap.getBoundingClientRect()
    setCursor({ x: e.clientX - r.left, y: e.clientY - r.top })
  }

  const activeItem = items.find((i) => i.id === active) ?? null

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={() => setActive(null)}
      className={cn("relative", className)}
    >
      <ul className="divide-y divide-border/60 border-y border-border/60">
        {items.map((item, i) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              onMouseEnter={() => setActive(item.id)}
              onFocus={() => setActive(item.id)}
              className="group relative grid w-full grid-cols-[auto_1fr_auto] items-center gap-6 py-8 text-left transition-colors sm:py-10"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-6">
                <span
                  className={cn(
                    "font-display text-[clamp(1.75rem,4vw,3.25rem)] font-medium leading-[1.05] tracking-[-0.02em] transition-all duration-300",
                    active === item.id
                      ? "translate-x-2 text-foreground"
                      : "text-muted-foreground/75 group-hover:text-foreground",
                  )}
                >
                  {item.label}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70">
                  {item.meta}
                </span>
              </div>
              <span className="col-span-full mt-1 block text-[13px] leading-relaxed text-muted-foreground md:hidden">
                {item.description}
              </span>
              <span
                className={cn(
                  "hidden max-w-xs text-[13px] leading-relaxed text-muted-foreground transition-opacity md:block",
                  active === item.id ? "opacity-100" : "opacity-60",
                )}
              >
                {item.description}
              </span>
            </button>
          </motion.li>
        ))}
      </ul>

      <AnimatePresence>
        {activeItem && (
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{
              left: cursor.x,
              top: cursor.y,
            }}
            className="pointer-events-none absolute z-20 hidden aspect-[4/5] w-60 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border md:block"
          >
            <div className="absolute inset-0 bg-background" />
            <Image
              src={activeItem.image}
              alt=""
              fill
              sizes="280px"
              className="object-cover opacity-70 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background)/0.1)_0%,hsl(var(--background)/0.6)_70%,hsl(var(--background))_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,hsl(var(--primary)/0.15),transparent_70%)]" />
            <div className="absolute bottom-3 left-3 right-3 flex items-baseline justify-between gap-2">
              <span className="font-display text-[16px] font-medium leading-tight text-foreground">
                {activeItem.label}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                {activeItem.meta}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
