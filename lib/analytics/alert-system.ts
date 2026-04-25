/**
 * Multi-modal alert system with audio and visual alerts
 * Includes adaptive alert cooldown to prevent alert fatigue
 */

export type AlertLevel = 'WARNING' | 'CRITICAL';
export type AlertType = 'AUDIO' | 'VISUAL' | 'BOTH';

export interface Alert {
  id: string;
  level: AlertLevel;
  type: AlertType;
  timestamp: number;
  reason: string;
  evidence?: {
    score: number;
    frameIndex: number;
  };
}

interface AlertConfig {
  warningCooldown: number; // ms between warning alerts
  criticalCooldown: number; // ms between critical alerts
  consecutiveThreshold: number; // Frames needed for critical alert
  voiceEnabled: boolean;
}

const DEFAULT_CONFIG: AlertConfig = {
  warningCooldown: 3000,
  criticalCooldown: 5000,
  consecutiveThreshold: 3,
  voiceEnabled: true,
};

export class AlertSystem {
  private alerts: Alert[] = [];
  private lastAlertTime: { WARNING?: number; CRITICAL?: number } = {};
  private consecutiveCount: number = 0;
  private config: AlertConfig;
  private synth: SpeechSynthesisUtterance | null = null;

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.synth = new SpeechSynthesisUtterance();
  }

  /**
   * Evaluate if an alert should be triggered based on fatigue score
   */
  evaluateAndAlert(
    score: number,
    frameIndex: number,
    reason: string
  ): Alert | null {
    const alertLevel = score >= 70 ? 'CRITICAL' : score >= 50 ? 'WARNING' : null;

    if (!alertLevel) {
      this.consecutiveCount = 0;
      return null;
    }

    // Check cooldown
    const now = Date.now();
    const lastTime = this.lastAlertTime[alertLevel] || 0;
    const cooldown =
      alertLevel === 'CRITICAL' ? this.config.criticalCooldown : this.config.warningCooldown;

    if (now - lastTime < cooldown) {
      return null; // Still in cooldown
    }

    // For critical alerts, check consecutive threshold
    if (alertLevel === 'CRITICAL') {
      this.consecutiveCount++;
      if (this.consecutiveCount < this.config.consecutiveThreshold) {
        return null;
      }
    } else {
      this.consecutiveCount = 0;
    }

    // Create alert
    const alert: Alert = {
      id: `alert_${now}_${Math.random().toString(36).substr(2, 9)}`,
      level: alertLevel,
      type: 'BOTH',
      timestamp: now,
      reason,
      evidence: {
        score,
        frameIndex,
      },
    };

    this.alerts.push(alert);
    this.lastAlertTime[alertLevel] = now;

    return alert;
  }

  /**
   * Trigger audio alert (beep or voice)
   */
  triggerAudio(alert: Alert): void {
    if (!this.config.voiceEnabled) {
      this.beep(alert.level === 'CRITICAL' ? 2 : 1);
      return;
    }

    const message =
      alert.level === 'CRITICAL'
        ? 'Critical fatigue detected. Pull over immediately.'
        : 'Fatigue detected. Take a break.';

    this.speak(message);
  }

  private beep(count: number = 1): void {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const now = audioContext.currentTime;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.frequency.value = 1000;
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.1);
      }, i * 200);
    }
  }

  private speak(message: string): void {
    if (!this.synth) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    this.synth.text = message;
    this.synth.rate = 1;
    this.synth.pitch = 1;
    this.synth.volume = 0.8;

    window.speechSynthesis.speak(this.synth);
  }

  getAlerts(): Alert[] {
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  getLastAlert(): Alert | null {
    return this.alerts.length > 0 ? this.alerts[this.alerts.length - 1] : null;
  }

  getAlertStats(): {
    total: number;
    warnings: number;
    criticals: number;
  } {
    return {
      total: this.alerts.length,
      warnings: this.alerts.filter((a) => a.level === 'WARNING').length,
      criticals: this.alerts.filter((a) => a.level === 'CRITICAL').length,
    };
  }
}
