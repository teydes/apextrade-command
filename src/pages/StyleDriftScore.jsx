import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function StyleDriftScore() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 10) return [{ label: 'Drift', value: 'N/A' }];
    const n = closed.length;
    const quarter = Math.floor(n / 4);
    if (quarter < 2) return [{ label: 'Drift', value: 'N/A' }];
    const metricsByQ = [];
    for (let i = 0; i < 4; i++) {
      const slice = closed.slice(i * quarter, (i + 1) * quarter);
      if (slice.length === 0) continue;
      const pnls = slice.map(t => t.pnl || 0);
      const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
      const std = pnls.length > 1 ? Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (pnls.length - 1)) : 0;
      const symbols = new Set(slice.map(t => t.symbol));
      const strategies = new Set(slice.map(t => t.strategy));
      metricsByQ.push({ mean, std, symbolCount: symbols.size, strategyCount: strategies.size, count: slice.length });
    }
    const means = metricsByQ.map(m => m.mean);
    const stds = metricsByQ.map(m => m.std);
    const meanDrift = Math.max(...means) - Math.min(...means);
    const stdDrift = Math.max(...stds) - Math.min(...stds);
    const avgMean = means.reduce((a, b) => a + b, 0) / means.length;
    const driftPct = avgMean !== 0 ? (meanDrift / Math.abs(avgMean)) * 100 : 0;
    const driftScore = Math.min(driftPct / 2 + stdDrift / 5, 100);
    return [
      { label: 'Drift Score', value: driftScore.toFixed(0) + '/100', color: driftScore < 30 ? 'text-primary' : driftScore < 60 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'Mean Drift', value: meanDrift.toFixed(2), color: meanDrift < Math.abs(avgMean) ? 'text-primary' : 'text-red-400' },
      { label: 'Drift %', value: driftPct.toFixed(0) + '%', color: driftPct < 50 ? 'text-primary' : 'text-red-400' },
      { label: 'Std Drift', value: stdDrift.toFixed(2), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 10) return [];
    const n = closed.length;
    const quarter = Math.floor(n / 4);
    return ['Q1', 'Q2', 'Q3', 'Q4'].map((name, i) => {
      const slice = closed.slice(i * quarter, (i + 1) * quarter);
      const pnls = slice.map(t => t.pnl || 0);
      const mean = pnls.reduce((a, b) => a + b, 0) / Math.max(pnls.length, 1);
      return { name, value: mean };
    });
  };

  return (
    <QuantPage
      title="Style Drift Score"
      subtitle="Évolution de la stratégie dans le temps (dérive de style)"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Performance moyenne par quartile', refLine: 0 }}
      aiPrompt="Analyse le style drift. Un drift score élevé = la stratégie change de caractère (taille de position, instruments, approche). Un drift modéré est normal (adaptation). Un drift élevé peut signaler: sur-optimisation, tilt émotionnel, ou changement de marché. Visez un drift < 30 pour une stratégie stable."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, strategy: t.strategy, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Drift Score</strong>: variation de moyenne et écart-type entre quartiles</p>
        <p>Un style drift modéré = adaptation; un drift élevé = instabilité ou sur-optimisation.</p>
      </div>
    </QuantPage>
  );
}