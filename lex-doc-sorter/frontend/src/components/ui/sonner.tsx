"use client"

import { useTheme } from "@/context/theme-context"
import { Toaster as Sonner } from "sonner"

export function Toaster() {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      position="top-right"
      closeButton
      richColors
      toastOptions={{
        duration: 5000,
        classNames: {
          toast: "border border-border shadow-lg",
          title: "text-sm font-medium",
          description: "text-sm text-muted-foreground",
        },
      }}
    />
  )
}
