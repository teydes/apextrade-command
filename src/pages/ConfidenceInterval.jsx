import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Shield } from 'lucide-react';

export default function ConfidenceInterval() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'CI 95%', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1));
    const se = std / Math.sqrt(n);
    const z = n > 30 ? 1.96 : 2.262;
    const lower = mean - z * se;
    const upper = mean + z * se;
    const margin = z * se;
    const ciWidth = upper - lower;
    const precision = mean !== 0 ? Math.abs(ciWidth / mean) * 100 : 0;
    return [
      { label: 'Mean', value: mean.toFixed(2), color: mean >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'CI Lower', value: lower.toFixed(2), color: lower >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'CI Upper', value: upper.toFixed(2), color: 'text-primary' },
      { label: 'Précision', value: precision.toFixed(0) + '%', color: precision < 50 ? 'text-primary' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 10) return [];
    const window = Math.min(20, Math.floor(pnls.length / 3));
    const result = [];
    for (let i = window; i <= pnls.length; i++) {
      const slice = pnls.slice(i - window, i);
      const m = slice.reduce((a, b) => a + b, 0) / slice.length;
      const v = slice.reduce((s, p) => s + Math.pow(p - m, 2), 0) / (slice.length - 1);
      const se = Math.sqrt(v / slice.length);
      result.push({ name: `T${i}`, lower: m - 1.96 * se, mean: m, upper: m + 1.96 * se });
    }
    return result;
  };

  return (
    <QuantPage
      title="Confidence Interval (95%)"
      subtitle="Intervalle de confiance pour le PnL moyen par trade"
      icon={Shield}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'CI 95% glissant' }}
      dataKey="mean"
      aiPrompt="Analyse l'intervalle de confiance. Si le CI 95% ne contient pas zéro, la stratégie est significativement rentable (ou perdante). Plus le CI est étroit (bonne précision), plus l'estimation de l'expectancy est fiable. Un CI très large = trop peu de trades ou trop de volatilité."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">CI 95%</strong> = Mean ± Z × (σ / √n)</p>
        <p>Si le CI ne contient pas 0, la stratégie a un edge statistiquement significatif.</p>
      </div>
    </QuantPage>
  );
}