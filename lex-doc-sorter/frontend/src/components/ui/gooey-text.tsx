"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface GooeyTextProps {
  texts: string[]
  morphTime?: number
  cooldownTime?: number
  className?: string
  textClassName?: string
}

export function GooeyText({
  texts,
  morphTime = 1,
  cooldownTime = 0.35,
  className,
  textClassName,
}: GooeyTextProps) {
  const text1Ref = React.useRef<HTMLSpanElement>(null)
  const text2Ref = React.useRef<HTMLSpanElement>(null)
  const rafRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    let textIndex = texts.length - 1
    let time = new Date()
    let morph = 0
    let cooldown = cooldownTime

    if (text1Ref.current && text2Ref.current) {
      text1Ref.current.textContent = texts[textIndex % texts.length]
      text2Ref.current.textContent = texts[(textIndex + 1) % texts.length]
    }

    const setMorph = (fraction: number) => {
      if (!text1Ref.current || !text2Ref.current) return
      text2Ref.current.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`
      text2Ref.current.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`
      const inv = 1 - fraction
      text1Ref.current.style.filter = `blur(${Math.min(8 / inv - 8, 100)}px)`
      text1Ref.current.style.opacity = `${Math.pow(inv, 0.4) * 100}%`
    }

    const doCooldown = () => {
      morph = 0
      if (text1Ref.current && text2Ref.current) {
        text2Ref.current.style.filter = ""
        text2Ref.current.style.opacity = "100%"
        text1Ref.current.style.filter = ""
        text1Ref.current.style.opacity = "0%"
      }
    }

    const doMorph = () => {
      morph -= cooldown
      cooldown = 0
      let fraction = morph / morphTime
      if (fraction > 1) {
        cooldown = cooldownTime
        fraction = 1
      }
      setMorph(fraction)
    }

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      const newTime = new Date()
      const shouldIncrementIndex = cooldown > 0
      const dt = (newTime.getTime() - time.getTime()) / 1000
      time = newTime
      cooldown -= dt
      if (cooldown <= 0) {
        if (shouldIncrementIndex) {
          textIndex = (textIndex + 1) % texts.length
          if (text1Ref.current && text2Ref.current) {
            text1Ref.current.textContent = texts[textIndex % texts.length]
            text2Ref.current.textContent = texts[(textIndex + 1) % texts.length]
          }
        }
        doMorph()
      } else {
        doCooldown()
      }
      morph += dt
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [texts, morphTime, cooldownTime])

  return (
    <span className={cn("relative inline-block align-baseline", className)}>
      <svg className="absolute h-0 w-0" aria-hidden focusable="false">
        <defs>
          <filter id="gooey-threshold">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>

      <span
        className="relative inline-flex items-baseline justify-center"
        style={{ filter: "url(#gooey-threshold)" }}
      >
        <span
          ref={text1Ref}
          className={cn("inline-block select-none whitespace-nowrap", textClassName)}
        />
        <span
          ref={text2Ref}
          className={cn(
            "absolute left-0 top-0 inline-block select-none whitespace-nowrap",
            textClassName,
          )}
        />
      </span>
    </span>
  )
}
