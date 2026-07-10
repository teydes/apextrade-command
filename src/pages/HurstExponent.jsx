import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Waves } from 'lucide-react';

export default function HurstExponent() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 10) return [{ label: 'Hurst', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    let cumDev = 0, maxDev = -Infinity, minDev = Infinity;
    for (const p of pnls) {
      cumDev += (p - mean);
      if (cumDev > maxDev) maxDev = cumDev;
      if (cumDev < minDev) minDev = cumDev;
    }
    const R = maxDev - minDev;
    const variance = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / n;
    const S = Math.sqrt(variance);
    const hurst = S > 0 ? Math.log(R / S) / Math.log(n) : 0.5;
    const regime = hurst > 0.55 ? 'Tendance' : hurst < 0.45 ? 'Mean-Reversion' : 'Aléatoire';
    return [
      { label: 'Hurst Exponent', value: hurst.toFixed(3), color: hurst > 0.55 ? 'text-primary' : hurst < 0.45 ? 'text-yellow-400' : 'text-muted-foreground' },
      { label: 'Régime', value: regime, color: hurst > 0.55 ? 'text-primary' : 'text-yellow-400' },
      { label: 'R/S Ratio', value: (R / Math.max(S, 0.01)).toFixed(2), color: 'text-foreground' },
      { label: 'Persistance', value: hurst > 0.5 ? `${((hurst - 0.5) * 200).toFixed(0)}%` : `${((0.5 - hurst) * 200).toFixed(0)}%`, color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0;
    return closed.slice(-60).map((t, i) => {
      cumul += t.pnl || 0;
      return { name: `T${i + 1}`, value: cumul };
    });
  };

  return (
    <QuantPage
      title="Hurst Exponent"
      subtitle="Détection de tendance vs mean-reversion (mémoire long terme)"
      icon={Waves}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity Curve (mémoire)' }}
      aiPrompt="Analyse le Hurst Exponent. H > 0.5 = tendance persistante (momentum), H < 0.5 = mean-reversion, H ≈ 0.5 = marche aléatoire. Détermine si la stratégie profite de tendances ou de retournements."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Hurst Exponent</strong> via R/S analysis</p>
        <p>H &gt; 0.5 → les gains ont tendance à persister (momentum)</p>
        <p>H &lt; 0.5 → les gains ont tendance à se renverser (mean-reversion)</p>
      </div>
    </QuantPage>
  );
}