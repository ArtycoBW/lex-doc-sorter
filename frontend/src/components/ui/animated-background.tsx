"use client"

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)]" />

      <div
        className="absolute left-[-10%] top-[-20%] h-[500px] w-[500px] rounded-full opacity-15 dark:opacity-30"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary)/0.4) 0%, transparent 70%)",
          animation: "blob 20s ease-in-out infinite",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute right-[-5%] top-[20%] h-[600px] w-[600px] rounded-full opacity-10 dark:opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)",
          animation: "blob-reverse 25s ease-in-out infinite",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute bottom-[-10%] left-[20%] h-[500px] w-[500px] rounded-full opacity-10 dark:opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(14,165,233,0.4) 0%, transparent 70%)",
          animation: "blob 22s ease-in-out infinite 3s",
          filter: "blur(70px)",
        }}
      />
      <div
        className="absolute left-[50%] top-[50%] h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.05] dark:opacity-10"
        style={{
          background: "radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)",
          animation: "pulse-slow 10s ease-in-out infinite",
          filter: "blur(60px)",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.015]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)/0.3) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
    </div>
  )
}
