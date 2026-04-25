/**
 * Converts individual frame predictions into a 0-100 fatigue score
 * using temporal smoothing and state tracking
 */

export type FatigueState = 'SAFE' | 'WARNING' | 'CRITICAL';

interface ScoringConfig {
  windowSize: number; // Number of frames to consider
  safeThreshold: number; // Score below this = SAFE
  warningThreshold: number; // Score between safe and critical = WARNING
  smoothingFactor: number; // Exponential smoothing (0-1)
}

const DEFAULT_CONFIG: ScoringConfig = {
  windowSize: 15, // 0.5 seconds at 30fps
  safeThreshold: 25,
  warningThreshold: 60,
  smoothingFactor: 0.7,
};

export class FatigueScoringEngine {
  private frameHistory: number[] = [];
  private lastScore: number = 0;
  private config: ScoringConfig;

  constructor(config: Partial<ScoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a new frame prediction and get the updated fatigue score
   */
  addFrame(prediction: number): {
    score: number;
    state: FatigueState;
    trend: 'improving' | 'stable' | 'worsening';
  } {
    // Clamp prediction to 0-1 range
    const normalizedPrediction = Math.max(0, Math.min(1, prediction));
    this.frameHistory.push(normalizedPrediction);

    // Keep only recent frames
    if (this.frameHistory.length > this.config.windowSize) {
      this.frameHistory.shift();
    }

    // Calculate weighted average (more recent frames weighted higher)
    const windowScore = this.calculateWeightedAverage();

    // Apply exponential smoothing
    const smoothedScore = this.lastScore === 0 
      ? windowScore 
      : this.config.smoothingFactor * windowScore + 
        (1 - this.config.smoothingFactor) * this.lastScore;

    // Convert to 0-100 scale
    const finalScore = Math.round(smoothedScore * 100);
    this.lastScore = smoothedScore;

    // Determine state
    const state = this.getState(finalScore);

    // Calculate trend
    const trend = this.calculateTrend();

    return { score: finalScore, state, trend };
  }

  private calculateWeightedAverage(): number {
    if (this.frameHistory.length === 0) return 0;

    const weights = Array.from({ length: this.frameHistory.length }, (_, i) => {
      // Linear weights: older frames have lower weight
      return (i + 1) / (this.frameHistory.length * (this.frameHistory.length + 1) / 2);
    });

    const weightedSum = this.frameHistory.reduce((sum, val, i) => sum + val * weights[i], 0);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    return weightedSum / totalWeight;
  }

  private getState(score: number): FatigueState {
    if (score < this.config.safeThreshold) return 'SAFE';
    if (score < this.config.warningThreshold) return 'WARNING';
    return 'CRITICAL';
  }

  private calculateTrend(): 'improving' | 'stable' | 'worsening' {
    if (this.frameHistory.length < 5) return 'stable';

    const recent = this.frameHistory.slice(-5);
    const older = this.frameHistory.slice(-10, -5);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b) / older.length;

    const change = recentAvg - olderAvg;
    if (change < -0.1) return 'improving';
    if (change > 0.1) return 'worsening';
    return 'stable';
  }

  reset(): void {
    this.frameHistory = [];
    this.lastScore = 0;
  }

  getHistory(): number[] {
    return [...this.frameHistory];
  }

  getLastScore(): number {
    return Math.round(this.lastScore * 100);
  }
}
