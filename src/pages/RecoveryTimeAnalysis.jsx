import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Clock } from 'lucide-react';

export default function RecoveryTimeAnalysis() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'Recovery', value: 'N/A' }];
    let cumul = 0, peak = 0, inDD = false, ddStart = 0, recoveries = [];
    for (let i = 0; i < closed.length; i++) {
      cumul += closed[i].pnl || 0;
      if (cumul > peak) {
        if (inDD) {
          recoveries.push(i - ddStart);
          inDD = false;
        }
        peak = cumul;
      } else if (cumul < peak && !inDD) {
        inDD = true;
        ddStart = i;
      }
    }
    if (inDD) recoveries.push(closed.length - ddStart);
    if (recoveries.length === 0) return [
      { label: 'Recovery Time', value: '0', color: 'text-primary' },
      { label: 'Max Recovery', value: '0', color: 'text-primary' },
      { label: 'In DD', value: 'Non', color: 'text-primary' },
      { label: 'Recoveries', value: '0', color: 'text-foreground' },
    ];
    const avg = recoveries.reduce((a, b) => a + b, 0) / recoveries.length;
    const max = Math.max(...recoveries);
    const current = inDD ? recoveries[recoveries.length - 1] : 0;
    return [
      { label: 'Avg Recovery', value: avg.toFixed(0) + ' trades', color: avg < 5 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Max Recovery', value: max + ' trades', color: max < 10 ? 'text-primary' : 'text-red-400' },
      { label: 'Currently in DD', value: inDD ? `${current} trades` : 'Non', color: inDD ? 'text-yellow-400' : 'text-primary' },
      { label: 'Recoveries', value: recoveries.length.toString(), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0, peak = 0;
    return closed.slice(-60).map((t, i) => {
      cumul += t.pnl || 0;
      if (cumul > peak) peak = cumul;
      return { name: `T${i + 1}`, value: cumul, peak };
    });
  };

  return (
    <QuantPage
      title="Recovery Time Analysis"
      subtitle="Temps de récupération après drawdown (résilience)"
      icon={Clock}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity et pics (recovery)' }}
      aiPrompt="Analyse le temps de recovery. Un temps moyen de recovery < 5 trades = excellente résilience. > 10 trades = les drawdowns durent trop longtemps (souffrance psychologique). Le recovery max est le pire cas historique. Un trader actuellement en drawdown doit être prudent."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Recovery Time</strong>: nombre de trades pour revenir au peak après un drawdown</p>
        <p>La vitesse de récupération est aussi importante que la profondeur du drawdown.</p>
      </div>
    </QuantPage>
  );
}