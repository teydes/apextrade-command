import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Target } from 'lucide-react';

export default function StrategyDecay() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 10) return [{ label: 'Decay', value: 'N/A' }];
    const n = closed.length;
    const half = Math.floor(n / 2);
    const quarter = Math.floor(n / 4);
    const q1 = closed.slice(0, quarter);
    const q2 = closed.slice(quarter, half);
    const q3 = closed.slice(half, half + quarter);
    const q4 = closed.slice(half + quarter);
    const avg = (arr) => arr.length > 0 ? arr.reduce((s, t) => s + (t.pnl || 0), 0) / arr.length : 0;
    const a1 = avg(q1), a2 = avg(q2), a3 = avg(q3), a4 = avg(q4);
    const decayRate = a1 !== 0 ? ((a1 - a4) / Math.abs(a1)) * 100 : 0;
    const trend = a4 > a1 ? 'Croissant' : a4 < a1 ? 'Décroissant' : 'Stable';
    const halfLife = decayRate > 0 ? Math.log(2) / Math.log(1 + decayRate / 100) : Infinity;
    return [
      { label: 'Decay Rate', value: decayRate.toFixed(1) + '%', color: decayRate < 20 ? 'text-primary' : 'text-red-400' },
      { label: 'Trend', value: trend, color: trend === 'Croissant' ? 'text-primary' : trend === 'Décroissant' ? 'text-red-400' : 'text-yellow-400' },
      { label: 'Q1 Avg', value: a1.toFixed(2), color: a1 > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Q4 Avg', value: a4.toFixed(2), color: a4 > 0 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 10) return [];
    const quarter = Math.floor(closed.length / 4);
    const avg = (arr) => arr.length > 0 ? arr.reduce((s, t) => s + (t.pnl || 0), 0) / arr.length : 0;
    return [
      { name: 'Q1', value: avg(closed.slice(0, quarter)) },
      { name: 'Q2', value: avg(closed.slice(quarter, quarter * 2)) },
      { name: 'Q3', value: avg(closed.slice(quarter * 2, quarter * 3)) },
      { name: 'Q4', value: avg(closed.slice(quarter * 3)) },
    ];
  };

  return (
    <QuantPage
      title="Strategy Decay Analysis"
      subtitle="Détérioration temporelle de la performance (edge decay)"
      icon={Target}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'PnL moyen par quartile temporel', refLine: 0 }}
      aiPrompt="Analyse le decay de la stratégie. Si Q4 < Q1 = l'edge se détériore (decay). Un decay < 20% est normal (marché qui s'adapte). > 50% = l'edge est en train de disparaître. Un trend croissant = la stratégie s'améliore ( apprentissage). Identifie si la stratégie a une durée de vie limitée."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, date: t.entry_time, strategy: t.strategy })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Decay Rate</strong> = (Q1 avg − Q4 avg) / |Q1 avg| × 100</p>
        <p>Le decay mesure la vitesse à laquelle l'edge stratégique s'érode dans le temps.</p>
      </div>
    </QuantPage>
  );
}