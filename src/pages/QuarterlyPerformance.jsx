import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Calendar } from 'lucide-react';

export default function QuarterlyPerformance() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && t.entry_time);
    if (closed.length < 3) return [{ label: 'Quarterly', value: 'N/A' }];
    const byQ = {};
    for (const t of closed) {
      const d = new Date(t.entry_time);
      const q = `Q${Math.floor(d.getMonth() / 3) + 1}-${d.getFullYear()}`;
      if (!byQ[q]) byQ[q] = { pnl: 0, count: 0, wins: 0 };
      byQ[q].pnl += t.pnl || 0;
      byQ[q].count++;
      if ((t.pnl || 0) > 0) byQ[q].wins++;
    }
    const quarters = Object.entries(byQ).map(([q, d]) => ({ quarter: q, ...d, wr: d.wins / d.count }));
    const best = quarters.reduce((a, b) => a.pnl > b.pnl ? a : b);
    const worst = quarters.reduce((a, b) => a.pnl < b.pnl ? a : b);
    const totalPnl = quarters.reduce((s, q) => s + q.pnl, 0);
    return [
      { label: 'Best Quarter', value: best.quarter, color: 'text-primary' },
      { label: 'Best PnL', value: best.pnl.toFixed(2), color: 'text-primary' },
      { label: 'Worst Quarter', value: worst.quarter, color: 'text-red-400' },
      { label: 'Total PnL', value: totalPnl.toFixed(2), color: totalPnl >= 0 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && t.entry_time);
    const byQ = {};
    for (const t of closed) {
      const d = new Date(t.entry_time);
      const q = `Q${Math.floor(d.getMonth() / 3) + 1}-${d.getFullYear()}`;
      byQ[q] = (byQ[q] || 0) + (t.pnl || 0);
    }
    return Object.entries(byQ).map(([q, pnl]) => ({ name: q, value: pnl }));
  };

  return (
    <QuantPage
      title="Quarterly Performance"
      subtitle="PnL par trimestre (saisonnalité trimestrielle)"
      icon={Calendar}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'PnL par trimestre', refLine: 0 }}
      aiPrompt="Analyse la performance trimestrielle. Identifie les trimestres récurrents de sur/sous-performance. Les trimestres Q1 et Q4 ont souvent des comportements différents (nouvel an, fin d'année). Évalue la consistance inter-trimestrielle."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed' && t.entry_time).slice(-50).map(t => ({ pnl: t.pnl, date: t.entry_time, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Quarterly Performance</strong>: PnL agrégé par trimestre civil</p>
        <p>Détecte les patterns saisonniers trimestriels et la consistance de la performance.</p>
      </div>
    </QuantPage>
  );
}