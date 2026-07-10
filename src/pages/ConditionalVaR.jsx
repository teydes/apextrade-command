import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Shield } from 'lucide-react';

export default function ConditionalVaR() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl).sort((a, b) => a - b);
    if (pnls.length < 10) return [{ label: 'CVaR', value: 'N/A' }];
    const n = pnls.length;
    const var95Idx = Math.floor(n * 0.05);
    const var99Idx = Math.floor(n * 0.01);
    const var95 = pnls[var95Idx];
    const var99 = pnls[var99Idx];
    const tail95 = pnls.slice(0, Math.max(var95Idx, 1));
    const tail99 = pnls.slice(0, Math.max(var99Idx, 1));
    const cvar95 = tail95.length > 0 ? tail95.reduce((a, b) => a + b, 0) / tail95.length : var95;
    const cvar99 = tail99.length > 0 ? tail99.reduce((a, b) => a + b, 0) / tail99.length : var99;
    const ratio = Math.abs(var95) > 0 ? Math.abs(cvar95) / Math.abs(var95) : 0;
    return [
      { label: 'CVaR 95%', value: cvar95.toFixed(2), color: 'text-red-400' },
      { label: 'CVaR 99%', value: cvar99.toFixed(2), color: 'text-red-400' },
      { label: 'VaR 95%', value: var95.toFixed(2), color: 'text-yellow-400' },
      { label: 'Tail Ratio', value: ratio.toFixed(2), color: ratio < 1.3 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl).sort((a, b) => a - b);
    if (pnls.length < 10) return [];
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
      title="Conditional VaR (Expected Shortfall)"
      subtitle="Perte moyenne au-delà du VaR (mesure de risque de queue)"
      icon={Shield}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Distribution des PnL' }}
      aiPrompt="Analyse le CVaR (Expected Shortfall). Contrairement au VaR qui donne un seuil, le CVaR donne la perte moyenne si on dépasse ce seuil. CVaR > VaR en valeur absolue. Un ratio CVaR/VaR > 1.3 indique des queues épaisses = risque de perte extrême élevé."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">CVaR</strong> = E[Perte | Perte &lt; VaR] — espérance conditionnelle dans la queue</p>
        <p>Le CVaR mesure la gravité moyenne des pertes extrêmes, au-delà du VaR.</p>
      </div>
    </QuantPage>
  );
}