import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function RollingSortino() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 20) return [{ label: 'Rolling Sortino', value: 'N/A' }];
    const window = 20;
    const sortinos = [];
    for (let i = window; i <= pnls.length; i++) {
      const slice = pnls.slice(i - window, i);
      const m = slice.reduce((a, b) => a + b, 0) / window;
      const downside = slice.filter(p => p < 0);
      const dd = downside.length > 0 ? Math.sqrt(downside.reduce((s, p) => s + p * p, 0) / downside.length) : 0;
      if (dd > 0) sortinos.push(m / dd);
    }
    if (sortinos.length === 0) return [{ label: 'Rolling Sortino', value: 'N/A' }];
    const avg = sortinos.reduce((a, b) => a + b, 0) / sortinos.length;
    const min = Math.min(...sortinos);
    const pctPos = sortinos.filter(s => s > 0).length / sortinos.length * 100;
    return [
      { label: 'Avg Rolling Sortino', value: avg.toFixed(3), color: avg > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Min Sortino', value: min.toFixed(3), color: min > 0 ? 'text-primary' : 'text-red-400' },
      { label: '% > 0', value: pctPos.toFixed(0) + '%', color: pctPos > 70 ? 'text-primary' : 'text-red-400' },
      { label: 'Max', value: Math.max(...sortinos).toFixed(3), color: 'text-primary' },
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
      const m = slice.reduce((a, b) => a + b, 0) / window;
      const downside = slice.filter(p => p < 0);
      const dd = downside.length > 0 ? Math.sqrt(downside.reduce((s, p) => s + p * p, 0) / downside.length) : 0;
      result.push({ name: `T${i}`, value: dd > 0 ? m / dd : 0 });
    }
    return result;
  };

  return (
    <QuantPage
      title="Rolling Sortino Ratio"
      subtitle="Sortino glissant sur 20 trades (downside risk temporel)"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Sortino glissant (window=20)', refLine: 0 }}
      aiPrompt="Analyse le Rolling Sortino. Plus pertinent que le Rolling Sharpe car il ne pénalise que le risque baissier. Un Sortino glissant stable et positif = stratégie robuste. Les creux du Sortino identifient les périodes de pertes concentrées."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-60).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Rolling Sortino</strong> = moyenne / downside deviation (fenêtre 20)</p>
        <p>Le Sortino glissant isole les périodes où le risque de perte augmente.</p>
      </div>
    </QuantPage>
  );
}