"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface Step {
  label: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep

        return (
          <div key={step.label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-500",
                  isCompleted && "bg-blue-500 text-white scale-90",
                  isCurrent && "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-medium transition-colors duration-300 sm:block",
                  isCurrent && "text-foreground",
                  isCompleted && "text-blue-400",
                  !isCompleted && !isCurrent && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-px w-8 transition-colors duration-500",
                  isCompleted ? "bg-blue-500" : "bg-border"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
