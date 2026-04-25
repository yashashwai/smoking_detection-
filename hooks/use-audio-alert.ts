'use client';

import { useEffect, useRef } from 'react';
import { AlertSystem, Alert } from '@/lib/analytics/alert-system';

export function useAudioAlert() {
  const alertSystemRef = useRef<AlertSystem | null>(null);

  useEffect(() => {
    alertSystemRef.current = new AlertSystem({ voiceEnabled: true });
  }, []);

  const triggerAlert = (alert: Alert) => {
    if (alertSystemRef.current) {
      alertSystemRef.current.triggerAudio(alert);
    }
  };

  return { triggerAlert };
}
