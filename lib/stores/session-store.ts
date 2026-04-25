import { create } from 'zustand';

export interface DetectionEvent {
  id: string;
  timestamp: number;
  mode: 'fatigue' | 'smoking';
  prediction: number;
  fatigueScore?: number;
  alertLevel?: 'SAFE' | 'WARNING' | 'CRITICAL';
  frameIndex?: number;
}

export interface SessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  mode: 'fatigue' | 'smoking';
  totalFrames: number;
  events: DetectionEvent[];
  avgScore: number;
  maxScore: number;
  alerts: Array<{
    timestamp: number;
    level: 'WARNING' | 'CRITICAL';
    reason: string;
  }>;
}

interface SessionStore {
  sessionId: string;
  events: DetectionEvent[];
  metrics: SessionMetrics | null;
  performanceMetrics: {
    fps: number;
    apiLatency: number;
    processingTime: number;
  };
  
  initSession: (mode: 'fatigue' | 'smoking') => void;
  addEvent: (event: Omit<DetectionEvent, 'id'>) => void;
  updatePerformance: (fps: number, apiLatency: number, processingTime: number) => void;
  endSession: () => SessionMetrics | null;
  clearSession: () => void;
  getSessionData: () => SessionMetrics | null;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionId: '',
  events: [],
  metrics: null,
  performanceMetrics: {
    fps: 0,
    apiLatency: 0,
    processingTime: 0,
  },

  initSession: (mode: 'fatigue' | 'smoking') => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    set({
      sessionId,
      events: [],
      metrics: {
        sessionId,
        startTime: Date.now(),
        mode,
        totalFrames: 0,
        events: [],
        avgScore: 0,
        maxScore: 0,
        alerts: [],
      },
    });
  },

  addEvent: (event: Omit<DetectionEvent, 'id'>) => {
    const id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullEvent: DetectionEvent = { ...event, id };

    set((state) => {
      const newEvents = [...state.events, fullEvent];
      const newMetrics = state.metrics
        ? {
            ...state.metrics,
            events: newEvents,
            totalFrames: newEvents.length,
            avgScore: newEvents.reduce((sum, e) => sum + (e.prediction || 0), 0) / newEvents.length,
            maxScore: Math.max(...newEvents.map((e) => e.prediction || 0), 0),
          }
        : null;

      return {
        events: newEvents,
        metrics: newMetrics,
      };
    });
  },

  updatePerformance: (fps: number, apiLatency: number, processingTime: number) => {
    set({
      performanceMetrics: {
        fps: Math.round(fps),
        apiLatency: Math.round(apiLatency),
        processingTime: Math.round(processingTime),
      },
    });
  },

  endSession: () => {
    const state = get();
    if (!state.metrics) return null;

    const endedMetrics: SessionMetrics = {
      ...state.metrics,
      endTime: Date.now(),
    };

    set({ metrics: endedMetrics });
    return endedMetrics;
  },

  clearSession: () => {
    set({
      sessionId: '',
      events: [],
      metrics: null,
      performanceMetrics: {
        fps: 0,
        apiLatency: 0,
        processingTime: 0,
      },
    });
  },

  getSessionData: () => {
    return get().metrics;
  },
}));
