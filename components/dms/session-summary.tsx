'use client';

import { useEffect, useState } from 'react';
import { useSessionStore, SessionMetrics } from '@/lib/stores/session-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Share2, RefreshCw } from 'lucide-react';

export function SessionSummary() {
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const sessionStore = useSessionStore();

  useEffect(() => {
    const unsubscribe = useSessionStore.subscribe(
      (state) => state.metrics,
      () => setMetrics(sessionStore.getSessionData())
    );

    setMetrics(sessionStore.getSessionData());
    return unsubscribe;
  }, [sessionStore]);

  if (!metrics) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle>Session Summary</CardTitle>
          <CardDescription>No active session</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Start a session to view summary</p>
        </CardContent>
      </Card>
    );
  }

  const duration = metrics.endTime
    ? Math.round((metrics.endTime - metrics.startTime) / 1000)
    : Math.round((Date.now() - metrics.startTime) / 1000);

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  const exportAsCSV = () => {
    const headers = ['Timestamp', 'Prediction', 'Score', 'Alert Level'];
    const rows = metrics.events.map((event) => [
      new Date(event.timestamp).toISOString(),
      event.prediction?.toFixed(2),
      event.fatigueScore || (event.prediction! * 100).toFixed(0),
      event.alertLevel || 'NONE',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_${metrics.sessionId}_${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportAsJSON = () => {
    const json = JSON.stringify(metrics, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_${metrics.sessionId}_${new Date().toISOString()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle>Session Summary</CardTitle>
        <CardDescription>Overview of detection session</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
              <p className="text-xs text-muted-foreground mb-1">Mode</p>
              <p className="text-sm font-bold capitalize">{metrics.mode}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
              <p className="text-xs text-muted-foreground mb-1">Duration</p>
              <p className="text-sm font-bold">
                {minutes}m {seconds}s
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
              <p className="text-xs text-muted-foreground mb-1">Frames</p>
              <p className="text-sm font-bold">{metrics.totalFrames}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
              <p className="text-xs text-muted-foreground mb-1">Alerts</p>
              <p className="text-sm font-bold">{metrics.alerts.length}</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border/40">
            <p className="text-sm text-muted-foreground mb-2">Session ID</p>
            <p className="text-xs font-mono text-foreground break-all">{metrics.sessionId}</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsCSV}
              className="flex-1 gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsJSON}
              className="flex-1 gap-2"
            >
              <Share2 className="w-4 h-4" />
              Export JSON
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
