import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { CalendarDays } from 'lucide-react';

export default function YearlyComparison() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && t.entry_time);
    if (closed.length < 3) return [{ label: 'Yearly', value: 'N/A' }];
    const byYear = {};
    for (const t of closed) {
      const y = new Date(t.entry_time).getFullYear();
      if (!byYear[y]) byYear[y] = { pnl: 0, count: 0, wins: 0 };
      byYear[y].pnl += t.pnl || 0;
      byYear[y].count++;
      if ((t.pnl || 0) > 0) byYear[y].wins++;
    }
    const years = Object.entries(byYear).map(([y, d]) => ({ year: y, ...d, wr: (d.wins / d.count) * 100 }));
    const best = years.reduce((a, b) => a.pnl > b.pnl ? a : b);
    const worst = years.reduce((a, b) => a.pnl < b.pnl ? a : b);
    const avgPnl = years.reduce((s, y) => s + y.pnl, 0) / years.length;
    return [
      { label: 'Best Year', value: best.year, color: 'text-primary' },
      { label: 'Best PnL', value: best.pnl.toFixed(2), color: 'text-primary' },
      { label: 'Avg Year PnL', value: avgPnl.toFixed(2), color: avgPnl >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Years', value: years.length.toString(), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && t.entry_time);
    const byYear = {};
    for (const t of closed) {
      const y = new Date(t.entry_time).getFullYear();
      byYear[y] = (byYear[y] || 0) + (t.pnl || 0);
    }
    return Object.entries(byYear).map(([y, pnl]) => ({ name: y, value: pnl }));
  };

  return (
    <QuantPage
      title="Yearly Comparison"
      subtitle="Comparaison de performance année par année"
      icon={CalendarDays}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'PnL par année', refLine: 0 }}
      aiPrompt="Compare la performance annuelle. La consistance d'année en année est le meilleur indicateur de compétence durable. Une année exceptionnelle suivie d'années médiocres = chance. Des années régulières = compétence. Évalue la trajectoire de progression."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed' && t.entry_time).slice(-50).map(t => ({ pnl: t.pnl, date: t.entry_time })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Yearly Comparison</strong>: PnL agrégé par année civile</p>
        <p>La consistance inter-annuelle est le meilleur marqueur de compétence réelle.</p>
      </div>
    </QuantPage>
  );
}