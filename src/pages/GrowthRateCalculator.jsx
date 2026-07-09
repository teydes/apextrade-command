import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { TrendingUp } from 'lucide-react';

export default function GrowthRateCalculator() {
  const metrics = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    const totalReturn = pnls.reduce((a,b)=>a+b,0);
    const n = pnls.length;
    const avgPerTrade = totalReturn / n;
    const cagr = n > 0 ? (Math.pow(1 + totalReturn/10000, 252/Math.max(n,1)) - 1) * 100 : 0;
    const geometricMean = pnls.length ? Math.pow(pnls.reduce((a,p)=>a*(1+p/1000),1), 1/n) - 1 : 0;
    const bestStreak = (() => {
      let max = 0, cur = 0; pnls.forEach(p => { if (p > 0) { cur++; max = Math.max(max, cur); } else cur = 0; }); return max;
    })();
    return [
      { label: 'Total Return', value: `${totalReturn.toFixed(0)}€`, color: totalReturn >= 0 ? 'text-primary' : 'text-destructive' },
      { label: 'Avg/Trade', value: `${avgPerTrade.toFixed(2)}€`, color: avgPerTrade >= 0 ? 'text-primary' : 'text-destructive' },
      { label: 'CAGR Est.', value: `${cagr.toFixed(1)}%`, color: 'text-blue-400' },
      { label: 'Geo. Mean', value: `${(geometricMean*100).toFixed(2)}%`, color: 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    let cum = 0;
    return pnls.map((p, i) => { cum += p; return { name: `T${i+1}`, value: cum }; });
  };

  const aiPrompt = "Analyse le taux de croissance (CAGR, moyenne géométrique). Évalue si la croissance est durable et composée. Identifie la différence entre moyenne arithmétique et géométrique. Recommande des stratégies pour maximiser le CAGR tout en contrôlant le risque.";

  return (
    <QuantPage
      title="Growth Rate Calculator"
      subtitle="CAGR, moyenne géométrique, taux de croissance composé"
      icon={TrendingUp}
      metrics={metrics}
      chartData={chartData}
      chartType="area"
      chartConfig={{ title: 'Croissance Cumulative' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify({ pnls: trades.filter(t=>t.pnl!=null).map(t=>t.pnl), count: trades.length })}
    />
  );
}