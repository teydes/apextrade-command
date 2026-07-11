import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { RefreshCw } from 'lucide-react';

export default function PerformancePersistence() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 10) return [{ label: 'Persistence', value: 'N/A' }];
    const pnls = closed.map(t => t.pnl);
    const n = pnls.length;
    const half = Math.floor(n / 2);
    const firstHalf = pnls.slice(0, half);
    const secondHalf = pnls.slice(half);
    const mean1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const mean2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const persistence = mean1 !== 0 ? (mean2 / mean1) * 100 : 0;
    const sign1 = mean1 > 0 ? 1 : -1;
    const sign2 = mean2 > 0 ? 1 : -1;
    const sameSign = sign1 === sign2;
    const wins1 = firstHalf.filter(p => p > 0).length / firstHalf.length;
    const wins2 = secondHalf.filter(p => p > 0).length / secondHalf.length;
    const wrPersistence = Math.abs(wins1 - wins2) < 0.1;
    return [
      { label: 'Persistence', value: persistence.toFixed(0) + '%', color: sameSign && Math.abs(persistence - 100) < 50 ? 'text-primary' : 'text-red-400' },
      { label: 'Same Sign', value: sameSign ? 'Oui' : 'Non', color: sameSign ? 'text-primary' : 'text-red-400' },
      { label: '1st Half Mean', value: mean1.toFixed(2), color: mean1 >= 0 ? 'text-primary' : 'text-red-400' },
      { label: '2nd Half Mean', value: mean2.toFixed(2), color: mean2 >= 0 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul1 = 0, cumul2 = 0;
    const half = Math.floor(closed.length / 2);
    return closed.slice(-40).map((t, i) => {
      if (i < half) cumul1 += t.pnl || 0;
      else cumul2 += t.pnl || 0;
      return { name: `T${i + 1}`, value: i < half ? cumul1 : cumul2 };
    });
  };

  return (
    <QuantPage
      title="Performance Persistence"
      subtitle="La performance passée prédit-elle la performance future?"
      icon={RefreshCw}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Performance 1ère vs 2ème moitié', refLine: 0 }}
      aiPrompt="Analyse la persistance de la performance. Si la 1ère et 2ème moitié ont le même signe et des moyennes similaires (persistence ~100%), la stratégie est persistante. Si le signe change ou la magnitude varie beaucoup, la performance n'est pas persistante = elle pourrait être due au hasard. Une persistance > 70% est encourageante."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, date: t.entry_time })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Persistence</strong> = (Mean 2nd half / Mean 1st half) × 100</p>
        <p>La persistance est le test ultime: la performance passée prédict-elle le futur?</p>
      </div>
    </QuantPage>
  );
}