import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function RollingDrawdown() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 20) return [{ label: 'Rolling DD', value: 'N/A' }];
    const window = 20;
    const rollingDDs = [];
    for (let i = window; i <= pnls.length; i++) {
      const slice = pnls.slice(i - window, i);
      let cumul = 0, peak = 0, maxDD = 0;
      for (const p of slice) {
        cumul += p;
        if (cumul > peak) peak = cumul;
        const dd = peak - cumul;
        if (dd > maxDD) maxDD = dd;
      }
      rollingDDs.push(maxDD);
    }
    const avg = rollingDDs.reduce((a, b) => a + b, 0) / rollingDDs.length;
    const max = Math.max(...rollingDDs);
    const min = Math.min(...rollingDDs);
    const current = rollingDDs[rollingDDs.length - 1];
    return [
      { label: 'Avg Rolling DD', value: avg.toFixed(2), color: avg < 50 ? 'text-primary' : 'text-red-400' },
      { label: 'Max Rolling DD', value: max.toFixed(2), color: 'text-red-400' },
      { label: 'Min Rolling DD', value: min.toFixed(2), color: 'text-primary' },
      { label: 'Current DD', value: current.toFixed(2), color: current < avg ? 'text-primary' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 20) return [];
    const window = 20;
    const result = [];
    for (let i = window; i <= pnls.length; i++) {
      const slice = pnls.slice(i - window, i);
      let cumul = 0, peak = 0, maxDD = 0;
      for (const p of slice) {
        cumul += p;
        if (cumul > peak) peak = cumul;
        const dd = peak - cumul;
        if (dd > maxDD) maxDD = dd;
      }
      result.push({ name: `T${i}`, value: maxDD });
    }
    return result;
  };

  return (
    <QuantPage
      title="Rolling Drawdown"
      subtitle="Drawdown maximum glissant sur fenêtre de 20 trades"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="area"
      chartConfig={{ title: 'Max DD glissant (window=20)' }}
      aiPrompt="Analyse le rolling drawdown. Montre l'évolution du max drawdown dans des fenêtres glissantes. Si le rolling DD augmente = détérioration. Si il diminue = amélioration. Le DD actuel vs la moyenne indique si on est dans une période de stress normale ou anormale."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Rolling DD</strong>: max drawdown sur fenêtre glissante de 20 trades</p>
        <p>Permet de détecter si le risque de perte s'aggrave ou s'améliore dans le temps.</p>
      </div>
    </QuantPage>
  );
}