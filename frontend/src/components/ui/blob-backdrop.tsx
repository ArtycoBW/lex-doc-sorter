import { cn } from "@/lib/utils"

type Intensity = "soft" | "medium" | "strong"

const intensityToMask: Record<Intensity, string> = {
  soft: "radial-gradient(ellipse 95% 90% at 50% 50%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.22) 65%, rgba(0,0,0,0.06) 85%, transparent 100%)",
  medium:
    "radial-gradient(ellipse 92% 85% at 50% 50%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 38%, rgba(0,0,0,0.25) 68%, rgba(0,0,0,0.08) 86%, transparent 100%)",
  strong:
    "radial-gradient(ellipse 90% 82% at 50% 50%, black 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.32) 70%, rgba(0,0,0,0.1) 88%, transparent 100%)",
}

const intensityToTint: Record<Intensity, string> = {
  soft: "hsl(var(--background) / 0.42)",
  medium: "hsl(var(--background) / 0.58)",
  strong: "hsl(var(--background) / 0.72)",
}

const intensityToBlur: Record<Intensity, string> = {
  soft: "blur(16px) saturate(120%)",
  medium: "blur(22px) saturate(135%)",
  strong: "blur(28px) saturate(140%)",
}

export function BlobBackdrop({
  className,
  intensity = "medium",
  primaryGlow = false,
}: {
  className?: string
  intensity?: Intensity
  primaryGlow?: boolean
}) {
  const mask = intensityToMask[intensity]
  const tint = intensityToTint[intensity]
  const blur = intensityToBlur[intensity]

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute -z-10", className)}
      style={{
        maskImage: mask,
        WebkitMaskImage: mask,
        backdropFilter: blur,
        WebkitBackdropFilter: blur,
        filter: "blur(6px)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 62% at 48% 46%, ${tint} 0%, transparent 85%), radial-gradient(ellipse 48% 44% at 28% 64%, ${tint} 0%, transparent 85%), radial-gradient(ellipse 54% 50% at 74% 56%, ${tint} 0%, transparent 85%), radial-gradient(ellipse 40% 38% at 62% 32%, ${tint} 0%, transparent 80%)`,
          filter: "blur(10px)",
        }}
      />
      {primaryGlow && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 42% 38% at 50% 45%, hsl(var(--primary) / 0.1), transparent 75%)",
            filter: "blur(8px)",
          }}
        />
      )}
    </div>
  )
}
