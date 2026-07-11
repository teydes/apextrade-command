import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Sigma } from 'lucide-react';

export default function TStatistic() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'T-Stat', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1));
    const se = std / Math.sqrt(n);
    const tStat = se > 0 ? mean / se : 0;
    const pValue = (() => {
      const absT = Math.abs(tStat);
      if (n < 30) {
        if (absT > 2.764) return '< 0.01';
        if (absT > 2.048) return '< 0.05';
        if (absT > 1.701) return '< 0.10';
        return '> 0.10';
      }
      if (absT > 2.576) return '< 0.01';
      if (absT > 1.96) return '< 0.05';
      if (absT > 1.645) return '< 0.10';
      return '> 0.10';
    })();
    const significant = Math.abs(tStat) > 1.96;
    return [
      { label: 'T-Statistic', value: tStat.toFixed(3), color: Math.abs(tStat) > 1.96 ? 'text-primary' : 'text-yellow-400' },
      { label: 'P-Value', value: pValue, color: significant ? 'text-primary' : 'text-red-400' },
      { label: 'Mean ± SE', value: `${mean.toFixed(2)} ± ${se.toFixed(2)}`, color: 'text-foreground' },
      { label: 'Significatif', value: significant ? 'Oui (95%)' : 'Non', color: significant ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [];
    const min = Math.min(...pnls), max = Math.max(...pnls);
    const range = max - min || 1;
    const bins = 15;
    const counts = new Array(bins).fill(0);
    for (const p of pnls) {
      const idx = Math.min(Math.floor(((p - min) / range) * bins), bins - 1);
      counts[idx]++;
    }
    return counts.map((c, i) => ({ name: (min + (range / bins) * i).toFixed(0), value: c }));
  };

  return (
    <QuantPage
      title="T-Statistic & Significativité"
      subtitle="Test statistique: la stratégie est-elle significativement rentable?"
      icon={Sigma}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Distribution des PnL (normalité)' }}
      aiPrompt="Analyse le T-Statistic. Il teste si la moyenne des PnL est statistiquement différente de zéro. Un T supérieur à 1.96 = significatif à 95% (la stratégie est réellement rentable, pas due au hasard). Un T supérieur à 2.576 = significatif à 99%. Si non significatif, la stratégie pourrait ne pas avoir d'edge réel."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">T-Stat</strong> = Mean / (σ / √n) — test de Student</p>
        <p>Un T supérieur à 1.96 (p inférieur à 0.05) indique que la rentabilité n'est pas due au hasard.</p>
      </div>
    </QuantPage>
  );
}