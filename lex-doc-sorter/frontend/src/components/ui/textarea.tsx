import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          "overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.45)_transparent]",
          "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400/35 [&::-webkit-scrollbar-thumb:hover]:bg-slate-300/45 dark:[&::-webkit-scrollbar-thumb]:bg-slate-500/45 dark:[&::-webkit-scrollbar-thumb:hover]:bg-slate-400/60",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
