import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function ChoppinessIndex() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'Choppiness', value: 'N/A' }];
    const n = pnls.length;
    const atr = pnls.map(Math.abs);
    const sumATR = atr.reduce((a, b) => a + b, 0);
    let highest = -Infinity, lowest = Infinity, cumul = 0;
    for (const p of pnls) {
      cumul += p;
      if (cumul > highest) highest = cumul;
      if (cumul < lowest) lowest = cumul;
    }
    const range = highest - lowest;
    const chop = sumATR > 0 ? (100 * Math.log10(sumATR / Math.max(range, 0.01))) / Math.log10(n) : 50;
    return [
      { label: 'Choppiness', value: chop.toFixed(1), color: chop > 61.8 ? 'text-yellow-400' : chop < 38.2 ? 'text-primary' : 'text-foreground' },
      { label: 'Régime', value: chop > 61.8 ? 'Choppy' : chop < 38.2 ? 'Tendance' : 'Neutre', color: chop > 61.8 ? 'text-red-400' : 'text-primary' },
      { label: 'Range', value: range.toFixed(2), color: 'text-foreground' },
      { label: 'Sum ATR', value: sumATR.toFixed(2), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0;
    return closed.slice(-50).map((t, i) => {
      cumul += t.pnl || 0;
      return { name: `T${i + 1}`, value: cumul };
    });
  };

  return (
    <QuantPage
      title="Choppiness Index"
      subtitle="Détection de marché en range vs tendance (fractal dimension)"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity & régimes', refLine: 50 }}
      aiPrompt="Analyse le Choppiness Index. > 61.8 = marché choppy (range, favorise mean-reversion). < 38.2 = tendance forte (favorise momentum). Entre les deux = neutre. Évalue si les performances viennent de marchés directionnels ou choppy."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Choppiness</strong> = 100 × log₁₀(Σ|ATR| / Range) / log₁₀(n)</p>
        <p>Basé sur la dimension fractale. &gt; 61.8 = range (choppy), &lt; 38.2 = tendance.</p>
      </div>
    </QuantPage>
  );
}