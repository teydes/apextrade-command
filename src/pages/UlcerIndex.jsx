import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Shield } from 'lucide-react';

export default function UlcerIndex() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 2) return [{ label: 'Ulcer Index', value: 'N/A' }];
    let cumul = 0, peak = 0, sumSq = 0;
    for (const t of closed) {
      cumul += t.pnl || 0;
      if (cumul > peak) peak = cumul;
      const dd = ((peak - cumul) / Math.max(peak, 1)) * 100;
      sumSq += dd * dd;
    }
    const ulcer = Math.sqrt(sumSq / closed.length);
    const maxDD = Math.max(...Array.from({ length: closed.length }, (_, i) => {
      let c = 0, p = 0, maxDd = 0;
      for (let j = 0; j <= i; j++) {
        c += closed[j].pnl || 0;
        if (c > p) p = c;
        const dd = ((p - c) / Math.max(p, 1)) * 100;
        if (dd > maxDd) maxDd = dd;
      }
      return maxDd;
    }));
    return [
      { label: 'Ulcer Index', value: ulcer.toFixed(2), color: ulcer < 5 ? 'text-primary' : 'text-red-400' },
      { label: 'Max DD %', value: maxDD.toFixed(2) + '%', color: 'text-red-400' },
      { label: 'Ulcer Max', value: Math.max(ulcer, maxDD).toFixed(2), color: 'text-foreground' },
      { label: 'Stress Score', value: (ulcer * 10).toFixed(0), color: 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0, peak = 0;
    return closed.slice(-60).map((t, i) => {
      cumul += t.pnl || 0;
      if (cumul > peak) peak = cumul;
      return { name: `T${i + 1}`, value: ((peak - cumul) / Math.max(peak, 1)) * 100 };
    });
  };

  return (
    <QuantPage
      title="Ulcer Index"
      subtitle="Risque de drawdown pondéré par le carré (stress psychologique)"
      icon={Shield}
      metrics={metrics}
      chartData={chartData}
      chartType="area"
      chartConfig={{ title: 'Drawdown % (Ulcer)', refLine: 10 }}
      aiPrompt="Analyse l'Ulcer Index. Un UI < 5 est excellent, 5-10 acceptable, > 10 problématique. L'Ulcer pénalise plus les drawdowns profonds car il utilise le carré du DD%. Évalue le stress psychologique réel."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-30).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Ulcer Index</strong> = √(Σ DD² / n)</p>
        <p>Pondère les drawdowns par leur carré, capturant l'impact psychologique des pertes profondes mieux qu'une simple moyenne.</p>
      </div>
    </QuantPage>
  );
}