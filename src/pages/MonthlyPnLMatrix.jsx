import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Calendar } from 'lucide-react';

export default function MonthlyPnLMatrix() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && t.entry_time);
    if (closed.length < 3) return [{ label: 'Matrix', value: 'N/A' }];
    const byMonth = {};
    for (const t of closed) {
      const d = new Date(t.entry_time);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + (t.pnl || 0);
    }
    const months = Object.entries(byMonth);
    const positive = months.filter(([, p]) => p > 0);
    const negative = months.filter(([, p]) => p < 0);
    const totalPnl = months.reduce((s, [, p]) => s + p, 0);
    const bestMonth = months.reduce((a, b) => a[1] > b[1] ? a : b);
    const worstMonth = months.reduce((a, b) => a[1] < b[1] ? a : b);
    const positiveRate = (positive.length / months.length) * 100;
    return [
      { label: 'Best Month', value: bestMonth[0], color: 'text-primary' },
      { label: 'Best PnL', value: bestMonth[1].toFixed(2), color: 'text-primary' },
      { label: '% Positive', value: positiveRate.toFixed(0) + '%', color: positiveRate > 60 ? 'text-primary' : 'text-red-400' },
      { label: 'Months', value: months.length.toString(), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && t.entry_time);
    const byMonth = {};
    for (const t of closed) {
      const d = new Date(t.entry_time);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + (t.pnl || 0);
    }
    return Object.entries(byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, pnl]) => ({ name: month, value: pnl }));
  };

  return (
    <QuantPage
      title="Monthly PnL Matrix"
      subtitle="Matrice PnL mois par mois (saisonnalité et consistance)"
      icon={Calendar}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'PnL par mois', refLine: 0 }}
      aiPrompt="Analyse la matrice PnL mensuelle. Le % de mois positifs > 60% = stratégie régulière. Identifie les mois récurrents de sur/sous-performance (saisonnalité). Les mois consécutifs négatifs = période de drawdown prolongée. Évalue si certains mois sont systématiquement gagnants ou perdants."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed' && t.entry_time).slice(-50).map(t => ({ pnl: t.pnl, date: t.entry_time })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Monthly PnL Matrix</strong>: PnL agrégé par mois calendaire</p>
        <p>La régularité mensuelle est l'indicateur ultime de viabilité d'une stratégie.</p>
      </div>
    </QuantPage>
  );
}