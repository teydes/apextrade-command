import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { HeartCrack } from 'lucide-react';

export default function PainIndex() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 2) return [{ label: 'Pain Index', value: 'N/A' }];
    let cumul = 0, peak = 0, totalPain = 0, maxPain = 0;
    const underwater = [];
    for (const t of closed) {
      cumul += t.pnl || 0;
      if (cumul > peak) peak = cumul;
      const dd = peak - cumul;
      underwater.push({ name: `T${underwater.length + 1}`, value: dd });
      totalPain += dd;
      if (dd > maxPain) maxPain = dd;
    }
    const painIndex = totalPain / closed.length;
    const avgPain = totalPain / closed.length;
    return [
      { label: 'Pain Index', value: painIndex.toFixed(2), color: painIndex < 50 ? 'text-primary' : 'text-red-400' },
      { label: 'Max Pain', value: maxPain.toFixed(2), color: 'text-red-400' },
      { label: 'Avg Pain', value: avgPain.toFixed(2), color: 'text-foreground' },
      { label: 'Time Underwater', value: `${((underwater.filter(u => u.value > 0).length / closed.length) * 100).toFixed(0)}%`, color: 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0, peak = 0;
    return closed.slice(-60).map((t, i) => {
      cumul += t.pnl || 0;
      if (cumul > peak) peak = cumul;
      return { name: `T${i + 1}`, value: peak - cumul };
    });
  };

  return (
    <QuantPage
      title="Pain Index"
      subtitle="Profondeur moyenne × durée des drawdowns"
      icon={HeartCrack}
      metrics={metrics}
      chartData={chartData}
      chartType="area"
      chartConfig={{ title: 'Courbe Underwater (Drawdown)' }}
      aiPrompt="Analyse le Pain Index. C'est la moyenne de tous les drawdowns subis. Un Pain Index élevé indique des pertes prolongées et profondes. Compare avec le max drawdown pour évaluer la souffrance moyenne vs extrême."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, date: t.entry_time })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Pain Index</strong> = Moyenne des drawdowns sur toutes les périodes</p>
        <p>Le Pain Index capture à la fois la profondeur et la durée des drawdowns — un measure de souffrance psychologique du trader.</p>
      </div>
    </QuantPage>
  );
}