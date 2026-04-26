"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export enum Tag {
  H1 = "h1",
  H2 = "h2",
  H3 = "h3",
  P = "p",
}

type Particle = {
  x: number
  y: number
  r: number
  color: string
  alpha: number
  vx: number
  vy: number
  home: { x: number; y: number }
  seed: number
}

type Phase = "in" | "hold" | "out" | "cooldown"

export interface VaporizeTextCycleProps {
  texts: string[]
  tag?: Tag
  className?: string
  font?: {
    family?: string
    weight?: string | number
    size?: string
  }
  color?: string
  direction?: "left-to-right" | "right-to-left"
  holdDuration?: number
  animationDuration?: number
  vaporizeDuration?: number
  cooldown?: number
  density?: number
  spread?: number
}

export function VaporizeTextCycle({
  texts,
  tag = Tag.H2,
  className,
  font,
  color,
  direction = "left-to-right",
  holdDuration = 2200,
  vaporizeDuration = 1400,
  animationDuration = 900,
  cooldown = 350,
  density = 3.2,
  spread = 1.0,
}: VaporizeTextCycleProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const wrapRef = React.useRef<HTMLDivElement | null>(null)
  const particlesRef = React.useRef<Particle[]>([])
  const rafRef = React.useRef<number | null>(null)
  const phaseRef = React.useRef<Phase>("in")
  const phaseStartRef = React.useRef<number>(0)
  const indexRef = React.useRef<number>(0)

  React.useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resolvedColor = () => {
      if (color) return color
      const probe = document.createElement("span")
      probe.style.color = "hsl(var(--foreground))"
      document.body.appendChild(probe)
      const c = getComputedStyle(probe).color
      document.body.removeChild(probe)
      return c || "rgb(240,240,240)"
    }

    const readFontStyle = () => {
      const host = getComputedStyle(wrap)
      return {
        family: font?.family ?? host.fontFamily ?? "sans-serif",
        weight: String(font?.weight ?? host.fontWeight ?? "600"),
        size: font?.size ?? host.fontSize ?? "36px",
      }
    }

    const measure = () => {
      const rect = wrap.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      return rect
    }

    const sampleText = (text: string) => {
      const rect = measure()
      const { family, weight, size } = readFontStyle()
      const fillColor = resolvedColor()

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, rect.width, rect.height)
      ctx.fillStyle = fillColor
      ctx.textBaseline = "middle"
      ctx.textAlign = "center"
      ctx.font = `${weight} ${size} ${family}`
      ctx.fillText(text, rect.width / 2, rect.height / 2)
      ctx.restore()

      const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = img.data
      const particles: Particle[] = []
      const step = Math.max(2, Math.round(4 / density))

      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          const i = (y * canvas.width + x) * 4
          const alpha = data[i + 3]
          if (alpha > 80) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            particles.push({
              x: x / dpr,
              y: y / dpr,
              r: 0.9,
              color: `rgba(${r},${g},${b},`,
              alpha: 0,
              vx: 0,
              vy: 0,
              home: { x: x / dpr, y: y / dpr },
              seed: Math.random(),
            })
          }
        }
      }

      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.restore()
      particlesRef.current = particles
    }

    const setPhase = (p: Phase) => {
      phaseRef.current = p
      phaseStartRef.current = performance.now()
    }

    const advanceWord = () => {
      indexRef.current = (indexRef.current + 1) % texts.length
      sampleText(texts[indexRef.current])
      setPhase("in")
    }

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

    const render = (now: number) => {
      rafRef.current = requestAnimationFrame(render)
      const elapsed = now - phaseStartRef.current
      const particles = particlesRef.current
      const rect = wrap.getBoundingClientRect()

      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.scale(dpr, dpr)

      const dirSign = direction === "left-to-right" ? 1 : -1

      if (phaseRef.current === "in") {
        const t = Math.min(1, elapsed / animationDuration)
        const eased = easeOut(t)
        for (const p of particles) {
          const stagger = (dirSign > 0 ? p.home.x : rect.width - p.home.x) / rect.width
          const local = Math.min(1, Math.max(0, (t - stagger * 0.5) * 2))
          const lEased = easeOut(local)
          const off = (1 - lEased) * 24 * spread * (dirSign === 1 ? -1 : 1)
          p.x = p.home.x + off
          p.y = p.home.y
          p.alpha = lEased
          drawParticle(ctx, p)
        }
        if (t >= 1) setPhase("hold")
      } else if (phaseRef.current === "hold") {
        for (const p of particles) {
          p.x = p.home.x
          p.y = p.home.y
          p.alpha = 1
          drawParticle(ctx, p)
        }
        if (elapsed >= holdDuration) setPhase("out")
      } else if (phaseRef.current === "out") {
        const t = Math.min(1, elapsed / vaporizeDuration)
        for (const p of particles) {
          const stagger = (dirSign > 0 ? p.home.x : rect.width - p.home.x) / rect.width
          const local = Math.min(1, Math.max(0, (t - stagger * 0.35) * 1.6))
          const rise = local * local * 60 * spread
          const drift = Math.sin(p.seed * 6.28 + now * 0.002) * 14 * local
          p.x = p.home.x + drift + dirSign * local * 30
          p.y = p.home.y - rise
          p.alpha = 1 - local
          if (p.alpha > 0) drawParticle(ctx, p)
        }
        if (t >= 1) setPhase("cooldown")
      } else {
        if (elapsed >= cooldown) advanceWord()
      }

      ctx.restore()
    }

    const drawParticle = (
      c: CanvasRenderingContext2D,
      p: Particle,
    ) => {
      c.fillStyle = `${p.color}${Math.max(0, Math.min(1, p.alpha))})`
      c.beginPath()
      c.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      c.fill()
    }

    const start = () => {
      measure()
      sampleText(texts[indexRef.current])
      setPhase("in")
      rafRef.current = requestAnimationFrame(render)
    }

    const ro = new ResizeObserver(() => {
      measure()
      sampleText(texts[indexRef.current])
      setPhase("in")
    })
    ro.observe(wrap)

    if (document.fonts && "ready" in document.fonts) {
      document.fonts.ready.then(() => start())
    } else {
      start()
    }

    return () => {
      ro.disconnect()
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [
    texts,
    font?.family,
    font?.size,
    font?.weight,
    color,
    direction,
    holdDuration,
    vaporizeDuration,
    animationDuration,
    cooldown,
    density,
    spread,
  ])

  const Tagged = tag as keyof React.JSX.IntrinsicElements

  return (
    <div
      ref={wrapRef}
      className={cn("relative inline-block", className)}
      aria-label={texts.join(", ")}
    >
      <Tagged
        aria-hidden
        className="invisible whitespace-nowrap select-none"
        style={{
          fontFamily: font?.family,
          fontWeight: font?.weight,
          fontSize: font?.size,
        }}
      >
        {texts.reduce((a, b) => (a.length >= b.length ? a : b), "")}
      </Tagged>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0"
        aria-hidden
      />
    </div>
  )
}
