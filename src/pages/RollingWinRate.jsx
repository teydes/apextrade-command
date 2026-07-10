import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function RollingWinRate() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 20) return [{ label: 'Rolling WR', value: 'N/A' }];
    const window = 20;
    const wrs = [];
    for (let i = window; i <= pnls.length; i++) {
      const slice = pnls.slice(i - window, i);
      const wins = slice.filter(p => p > 0).length;
      wrs.push((wins / window) * 100);
    }
    const avg = wrs.reduce((a, b) => a + b, 0) / wrs.length;
    const min = Math.min(...wrs);
    const max = Math.max(...wrs);
    const current = wrs[wrs.length - 1];
    const stability = max - min;
    return [
      { label: 'Avg Rolling WR', value: avg.toFixed(1) + '%', color: avg > 50 ? 'text-primary' : 'text-red-400' },
      { label: 'Current WR', value: current.toFixed(1) + '%', color: current > 50 ? 'text-primary' : 'text-red-400' },
      { label: 'Min WR', value: min.toFixed(1) + '%', color: 'text-red-400' },
      { label: 'Stability', value: stability.toFixed(1) + '%', color: stability < 20 ? 'text-primary' : 'text-yellow-400' },
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
      const wins = slice.filter(p => p > 0).length;
      result.push({ name: `T${i}`, value: (wins / window) * 100 });
    }
    return result;
  };

  return (
    <QuantPage
      title="Rolling Win Rate"
      subtitle="Win rate glissant sur fenêtre de 20 trades (stabilité)"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Win Rate glissant (window=20)', refLine: 50 }}
      aiPrompt="Analyse le rolling win rate. La stabilité (max - min) < 20% = excellent. Un WR qui chute brutalement = tilt ou changement de régime. Un WR qui s'améliore = progression. Le WR actuel vs la moyenne indique si on est dans une bonne ou mauvaise séquence."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Rolling Win Rate</strong>: % de trades gagnants sur fenêtre glissante de 20</p>
        <p>La stabilité du win rate est un meilleur indicateur que le win rate global.</p>
      </div>
    </QuantPage>
  );
}