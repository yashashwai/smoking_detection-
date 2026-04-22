"use client"

import { Progress } from "@/components/ui/progress"
import { AlertTriangle, CheckCircle, Brain, CigaretteOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface ResultCardProps {
  detected: boolean
  confidence: number
  label: string
  mode: "fatigue" | "smoking"
}

export function ResultCard({ detected, confidence, label, mode }: ResultCardProps) {
  const confidencePercent = Math.round(confidence * 100)
  
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border-2 p-6 transition-all duration-500 animate-in slide-in-from-bottom-4 fade-in",
      detected 
        ? "border-destructive/50 bg-destructive/10" 
        : "border-success/50 bg-success/10"
    )}>
      {/* Background glow */}
      <div className={cn(
        "absolute inset-0 opacity-20",
        detected 
          ? "bg-gradient-to-br from-destructive/30 to-transparent" 
          : "bg-gradient-to-br from-success/30 to-transparent"
      )} />
      
      <div className="relative z-10 flex flex-col items-center text-center gap-4">
        {/* Icon */}
        <div className={cn(
          "p-4 rounded-full",
          detected ? "bg-destructive/20" : "bg-success/20"
        )}>
          {detected ? (
            <AlertTriangle className={cn(
              "w-12 h-12",
              detected ? "text-destructive" : "text-success"
            )} />
          ) : (
            <CheckCircle className={cn(
              "w-12 h-12",
              detected ? "text-destructive" : "text-success"
            )} />
          )}
        </div>
        
        {/* Label */}
        <div>
          <h3 className={cn(
            "text-3xl font-bold mb-1",
            detected ? "text-destructive" : "text-success"
          )}>
            {label}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            {mode === "fatigue" ? (
              <Brain className="w-4 h-4" />
            ) : (
              <CigaretteOff className="w-4 h-4" />
            )}
            {mode === "fatigue" ? "Fatigue Detection" : "Smoking Detection"}
          </p>
        </div>

        {/* Confidence Bar */}
        <div className="w-full max-w-xs space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Confidence</span>
            <span className={cn(
              "font-semibold",
              detected ? "text-destructive" : "text-success"
            )}>
              {confidencePercent}%
            </span>
          </div>
          <Progress 
            value={confidencePercent} 
            className={cn(
              "h-3",
              detected 
                ? "[&>[data-slot=progress-indicator]]:bg-destructive" 
                : "[&>[data-slot=progress-indicator]]:bg-success"
            )}
          />
        </div>
      </div>
    </div>
  )
}
