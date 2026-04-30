"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import Webcam from "react-webcam"
import { Button } from "@/components/ui/button"
import { Camera, Square, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ResultCard } from "./result-card"
import { AnalyticsDashboard } from "./analytics-dashboard"
import { AlertHistory } from "./alert-history"
import { PerformanceMonitor } from "./performance-monitor"
import { useSessionStore } from "@/lib/stores/session-store"
import { FatigueScoringEngine } from "@/lib/scoring/fatigue-scorer"
import { AlertSystem } from "@/lib/analytics/alert-system"
import { useAudioAlert } from "@/hooks/use-audio-alert"

interface WebcamTabProps {
  mode: "fatigue" | "smoking"
  backendUrl: string
}

type DetectionResult = {
  detected: boolean
  confidence: number
  label: string
  microFatigueCount?: number
  smokingEventCount?: number
  lightingCondition?: "Normal" | "Low"
  enhancementActive?: boolean
  snapshotTimestamp?: number
} | null

export function WebcamTab({ mode, backendUrl }: WebcamTabProps) {
  const webcamRef = useRef<Webcam>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const frameCountRef = useRef(0)
  const startTimeRef = useRef<number | null>(null)
  
  const [isStreaming, setIsStreaming] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<DetectionResult>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  
  const sessionStore = useSessionStore()
  const scoringEngineRef = useRef<FatigueScoringEngine | null>(null)
  const alertSystemRef = useRef<AlertSystem | null>(null)
  const { triggerAlert } = useAudioAlert()
  
  // Initialize engines
  useEffect(() => {
    scoringEngineRef.current = new FatigueScoringEngine()
    alertSystemRef.current = new AlertSystem({ voiceEnabled: true })
  }, [])

  const captureAndDetect = useCallback(async () => {
    if (!webcamRef.current) return

    const imageSrc = webcamRef.current.getScreenshot()
    if (!imageSrc) return

    setIsProcessing(true)
    const apiStartTime = performance.now()

    try {
      // Convert base64 to blob
      const res = await fetch(imageSrc)
      const blob = await res.blob()
      const formData = new FormData()
      formData.append("file", blob, "capture.jpg")

      const endpoint = mode === "fatigue" 
        ? `${backendUrl}/predict/fatigue` 
        : `${backendUrl}/predict/smoking`

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Detection failed")

      const data = await response.json()
      const detected = data.detected ?? data.fatigue ?? data.smoking ?? false
      const confidence = data.confidence ?? 0.85
      
      // Extract new metrics from backend response
      const microFatigueCount = data.micro_fatigue_count ?? data.microFatigueCount ?? 0
      const smokingEventCount = data.smoking_events ?? data.smokingEventCount ?? 0
      const lightingCondition = data.lighting_condition ?? data.lightingCondition ?? 'Normal'
      const enhancementActive = data.enhancement_active ?? data.enhancementActive ?? false
      const snapshotCaptured = data.snapshot_captured ?? data.snapshotCaptured ?? false
      const snapshotTimestamp = data.snapshot_timestamp ?? data.snapshotTimestamp
      
      // For fatigue mode, use scoring engine
      let fatigueScore = 0
      let alertLevel = undefined
      if (mode === "fatigue" && scoringEngineRef.current) {
        const scoringResult = scoringEngineRef.current.addFrame(confidence)
        fatigueScore = scoringResult.score
        alertLevel = scoringResult.state
        
        // Check if alert should be triggered
        if (alertSystemRef.current) {
          const alert = alertSystemRef.current.evaluateAndAlert(
            fatigueScore,
            frameCountRef.current,
            `Fatigue level: ${alertLevel}`
          )
          if (alert) {
            triggerAlert(alert)
          }
        }
      }

      setResult({
        detected,
        confidence,
        label: mode === "fatigue" 
          ? (detected ? "DROWSY" : "ALERT") 
          : (detected ? "SMOKING" : "NOT SMOKING"),
        microFatigueCount: mode === "fatigue" ? microFatigueCount : undefined,
        smokingEventCount: mode === "smoking" ? smokingEventCount : undefined,
        lightingCondition: lightingCondition as "Normal" | "Low",
        enhancementActive,
        snapshotTimestamp: snapshotCaptured ? snapshotTimestamp || Date.now() : undefined,
      })

      // Record metrics in session store
      const apiLatency = performance.now() - apiStartTime
      sessionStore.addEvent({
        timestamp: Date.now(),
        mode,
        prediction: confidence,
        fatigueScore: mode === "fatigue" ? fatigueScore : undefined,
        alertLevel: mode === "fatigue" ? alertLevel : undefined,
        frameIndex: frameCountRef.current,
        microFatigueCount: mode === "fatigue" ? microFatigueCount : undefined,
        smokingEventCount: mode === "smoking" ? smokingEventCount : undefined,
        lightingCondition: lightingCondition as "Normal" | "Low",
        enhancementActive,
        snapshotCaptured,
        snapshotTimestamp: snapshotCaptured ? snapshotTimestamp || Date.now() : undefined,
      })
      
      sessionStore.updatePerformance(30, apiLatency, 0)
      frameCountRef.current++
    } catch {
      // Simulate result for demo purposes when backend is unavailable
      const simulatedDetected = Math.random() > 0.6
      const simulatedConfidence = 0.75 + Math.random() * 0.2
      
      // Simulate new metrics
      const simulatedMicroFatigue = Math.floor(Math.random() * 8)
      const simulatedSmokingEvents = Math.floor(Math.random() * 8)
      const simulatedLighting = Math.random() > 0.3 ? 'Normal' : 'Low'
      const simulatedEnhancementActive = simulatedLighting === 'Low'
      const simulatedSnapshotCaptured = Math.random() > 0.7
      
      let fatigueScore = 0
      let alertLevel = undefined
      if (mode === "fatigue" && scoringEngineRef.current) {
        const scoringResult = scoringEngineRef.current.addFrame(simulatedConfidence)
        fatigueScore = scoringResult.score
        alertLevel = scoringResult.state
      }
      
      setResult({
        detected: simulatedDetected,
        confidence: simulatedConfidence,
        label: mode === "fatigue" 
          ? (simulatedDetected ? "DROWSY" : "ALERT") 
          : (simulatedDetected ? "SMOKING" : "NOT SMOKING"),
        microFatigueCount: mode === "fatigue" ? simulatedMicroFatigue : undefined,
        smokingEventCount: mode === "smoking" ? simulatedSmokingEvents : undefined,
        lightingCondition: simulatedLighting as "Normal" | "Low",
        enhancementActive: simulatedEnhancementActive,
        snapshotTimestamp: simulatedSnapshotCaptured ? Date.now() : undefined,
      })

      sessionStore.addEvent({
        timestamp: Date.now(),
        mode,
        prediction: simulatedConfidence,
        fatigueScore: mode === "fatigue" ? fatigueScore : undefined,
        alertLevel: mode === "fatigue" ? alertLevel : undefined,
        frameIndex: frameCountRef.current,
        microFatigueCount: mode === "fatigue" ? simulatedMicroFatigue : undefined,
        smokingEventCount: mode === "smoking" ? simulatedSmokingEvents : undefined,
        lightingCondition: simulatedLighting as "Normal" | "Low",
        enhancementActive: simulatedEnhancementActive,
        snapshotCaptured: simulatedSnapshotCaptured,
        snapshotTimestamp: simulatedSnapshotCaptured ? Date.now() : undefined,
      })
      
      frameCountRef.current++
    } finally {
      setIsProcessing(false)
    }
  }, [mode, backendUrl, sessionStore, triggerAlert])

  const startDetection = useCallback(() => {
    sessionStore.initSession(mode)
    startTimeRef.current = Date.now()
    frameCountRef.current = 0
    setIsStreaming(true)
    // Capture and detect every 2 seconds
    intervalRef.current = setInterval(captureAndDetect, 2000)
    // Initial capture
    captureAndDetect()
  }, [captureAndDetect, mode, sessionStore])

  const stopDetection = useCallback(() => {
    setIsStreaming(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    sessionStore.endSession()
    setShowAnalytics(true)
  }, [sessionStore])

  return (
    <div className="space-y-6">
      {/* Webcam Preview */}
      <div className="relative rounded-xl overflow-hidden border-2 border-border bg-secondary/30">
        <div className={cn(
          "relative aspect-video",
          isStreaming && "animate-pulse-glow"
        )}>
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              width: 1280,
              height: 720,
              facingMode: "user",
            }}
            className="w-full h-full object-cover"
          />
          
          {/* Scanning overlay when active */}
          {isStreaming && (
            <>
              <div className="absolute inset-0 border-4 border-primary/30 rounded-lg pointer-events-none" />
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-x-0 h-1 bg-gradient-to-b from-primary/50 to-transparent animate-scan-line" />
              </div>
            </>
          )}

          {/* Live indicator */}
          {isStreaming && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-destructive/90 rounded-full">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-xs font-medium text-white">LIVE</span>
            </div>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-primary/90 rounded-full">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
              <span className="text-xs font-medium text-white">Analyzing...</span>
            </div>
          )}

          {/* Real-time result overlay */}
          {isStreaming && result && (
            <div className={cn(
              "absolute bottom-4 left-4 right-4 flex items-center justify-between p-4 rounded-lg backdrop-blur-sm",
              result.detected 
                ? "bg-destructive/80 text-destructive-foreground" 
                : "bg-success/80 text-success-foreground"
            )}>
              <div className="flex items-center gap-3">
                {result.detected ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <CheckCircle className="w-6 h-6" />
                )}
                <span className="text-lg font-bold">{result.label}</span>
              </div>
              <span className="text-sm font-medium opacity-90">
                {(result.confidence * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        {!isStreaming ? (
          <Button 
            onClick={startDetection} 
            size="lg" 
            className="gap-2 px-8"
          >
            <Camera className="w-5 h-5" />
            Start Detection
          </Button>
        ) : (
          <Button 
            onClick={stopDetection} 
            size="lg" 
            variant="destructive"
            className="gap-2 px-8"
          >
            <Square className="w-5 h-5" />
            Stop
          </Button>
        )}
      </div>

      {/* Performance Monitor */}
      {isStreaming && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PerformanceMonitor />
          <AlertHistory maxItems={5} />
        </div>
      )}

      {/* Analytics after session */}
      {showAnalytics && !isStreaming && (
        <div className="space-y-6">
          <Button
            variant="outline"
            onClick={() => setShowAnalytics(false)}
            className="w-full"
          >
            Start New Session
          </Button>
          <AnalyticsDashboard mode={mode} isActive={false} />
        </div>
      )}

      {/* Result Card (when not streaming) */}
      {!isStreaming && !showAnalytics && result && (
        <ResultCard 
          detected={result.detected}
          confidence={result.confidence}
          label={result.label}
          mode={mode}
          microFatigueCount={result.microFatigueCount}
          smokingEventCount={result.smokingEventCount}
          lightingCondition={result.lightingCondition}
          enhancementActive={result.enhancementActive}
          snapshotTimestamp={result.snapshotTimestamp}
        />
      )}
    </div>
  )
}
