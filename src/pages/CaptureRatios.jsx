import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { TrendingUp } from 'lucide-react';

export default function CaptureRatios() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'Capture', value: 'N/A' }];
    const sorted = [...closed].sort((a, b) => (a.entry_time || '').localeCompare(b.entry_time || ''));
    const winning = sorted.filter(t => t.pnl > 0);
    const losing = sorted.filter(t => t.pnl < 0);
    const avgUp = winning.length > 0 ? winning.reduce((s, t) => s + t.pnl, 0) / winning.length : 0;
    const avgDown = losing.length > 0 ? Math.abs(losing.reduce((s, t) => s + t.pnl, 0) / losing.length) : 0;
    const upsideCapture = avgDown > 0 ? (avgUp / avgDown) * 100 : avgUp > 0 ? 100 : 0;
    const downsideCapture = avgUp > 0 ? (avgDown / avgUp) * 100 : avgDown > 0 ? 100 : 0;
    const captureRatio = downsideCapture > 0 ? upsideCapture / downsideCapture : 0;
    return [
      { label: 'Upside Capture', value: upsideCapture.toFixed(0) + '%', color: upsideCapture > 100 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Downside Capture', value: downsideCapture.toFixed(0) + '%', color: downsideCapture < 100 ? 'text-primary' : 'text-red-400' },
      { label: 'Capture Ratio', value: captureRatio.toFixed(2), color: captureRatio > 1 ? 'text-primary' : 'text-red-400' },
      { label: 'Avg Win', value: avgUp.toFixed(2), color: 'text-primary' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const sorted = [...closed].sort((a, b) => (a.entry_time || '').localeCompare(b.entry_time || ''));
    let cumul = 0;
    return sorted.slice(-50).map((t, i) => {
      cumul += t.pnl || 0;
      return { name: `T${i + 1}`, value: cumul };
    });
  };

  return (
    <QuantPage
      title="Capture Ratios"
      subtitle="Upside/Downside capture: performance en marché gagnant vs perdant"
      icon={TrendingUp}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity Curve' }}
      aiPrompt="Analyse les Capture Ratios. Upside > 100% = surperformance en marché haussier. Downside < 100% = protection en marché baissier. Un ratio > 1 (upside > downside) indique une bonne asymétrie. Évalue si le trader profite des bonnes conditions et se protège des mauvaises."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Upside Capture</strong> = Avg Win / Avg Loss × 100</p>
        <p><strong className="text-foreground">Downside Capture</strong> = Avg Loss / Avg Win × 100</p>
        <p>Le ratio idéal: upside élevé, downside bas = capturer les gains, limiter les pertes.</p>
      </div>
    </QuantPage>
  );
}