import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { LineChart as LineChartIcon } from 'lucide-react';

export default function EquityCurveFitness() {
  const metrics = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (pnls.length < 5) return [];
    let cumSum = 0, peak = 0, maxDD = 0, ddCount = 0, recoveryTime = 0, maxRecovery = 0;
    const equity = pnls.map(p => { cumSum += p; peak = Math.max(peak, cumSum); const dd = cumSum - peak; maxDD = Math.min(maxDD, dd); return cumSum; });
    const totalReturn = cumSum;
    const avgReturn = totalReturn / pnls.length;
    const std = Math.sqrt(pnls.reduce((a,b)=>a+(b-avgReturn)**2,0)/pnls.length);
    const sharpe = std ? avgReturn/std : 0;
    const smoothness = Math.abs(maxDD) ? totalReturn / Math.abs(maxDD) : 0;
    const monotonocity = (() => {
      let pos = 0; for (let i = 1; i < equity.length; i++) if (equity[i] >= equity[i-1]) pos++;
      return pos / (equity.length - 1);
    })();
    return [
      { label: 'Smoothness', value: smoothness.toFixed(2), color: smoothness > 3 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Monotonicity', value: `${(monotonocity*100).toFixed(0)}%`, color: monotonocity > 0.6 ? 'text-primary' : 'text-destructive' },
      { label: 'Per-Trade Sharpe', value: sharpe.toFixed(3), color: sharpe > 0.5 ? 'text-primary' : 'text-destructive' },
      { label: 'Total Return', value: `${totalReturn.toFixed(0)}€`, color: totalReturn >= 0 ? 'text-primary' : 'text-destructive' },
    ];
  };

  const chartData = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    let cumSum = 0;
    return pnls.map((p, i) => { cumSum += p; return { name: `T${i+1}`, value: cumSum }; });
  };

  const aiPrompt = "Analyse la fitness de la courbe d'équity. Évalue la smoothness, la monotonicity et la régularité de la croissance. Une courbe idéale est lisse, monotone et croissante. Identifie les ruptures de tendance et recommande des améliorations.";

  return (
    <QuantPage
      title="Equity Curve Fitness"
      subtitle="Smoothness, monotonicity, qualité de la courbe"
      icon={LineChartIcon}
      metrics={metrics}
      chartData={chartData}
      chartType="area"
      chartConfig={{ title: 'Equity Curve Fitness' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify({ pnls: trades.filter(t=>t.pnl!=null).map(t=>t.pnl) })}
    />
  );
}