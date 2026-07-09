import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Gauge } from 'lucide-react';

export default function CalmarRatio() {
  const metrics = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    const totalReturn = pnls.reduce((a,b)=>a+b,0);
    let peak = 0, cumSum = 0, maxDD = 0;
    pnls.forEach(p => { cumSum += p; peak = Math.max(peak, cumSum); maxDD = Math.min(maxDD, cumSum - peak); });
    const absMaxDD = Math.abs(maxDD);
    const calmar = absMaxDD ? totalReturn / absMaxDD : 0;
    const annualizedCalmar = calmar * Math.sqrt(252 / Math.max(pnls.length, 1));
    return [
      { label: 'Calmar Ratio', value: calmar.toFixed(2), color: calmar > 3 ? 'text-primary' : calmar > 1 ? 'text-blue-400' : 'text-destructive' },
      { label: 'Return', value: `${totalReturn.toFixed(0)}€`, color: totalReturn >= 0 ? 'text-primary' : 'text-destructive' },
      { label: 'Max Drawdown', value: `${absMaxDD.toFixed(0)}€`, color: 'text-destructive' },
      { label: 'Ann. Calmar', value: annualizedCalmar.toFixed(2), color: 'text-blue-400' },
    ];
  };

  const chartData = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    let cumSum = 0, peak = 0;
    return pnls.map((p, i) => { cumSum += p; peak = Math.max(peak, cumSum); return { name: `T${i+1}`, value: cumSum - peak }; });
  };

  const aiPrompt = "Analyse le ratio de Calmar (return/max drawdown). Évalue la qualité du rendement ajusté au risque maximum. Un Calmar > 3 est excellent. Identifie si le drawdown est proportionnel au rendement et recommande des optimisations.";

  return (
    <QuantPage
      title="Calmar Ratio"
      subtitle="Rendement ajusté au drawdown maximum"
      icon={Gauge}
      metrics={metrics}
      chartData={chartData}
      chartType="area"
      chartConfig={{ title: 'Drawdown Over Time' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify({ totalTrades: trades.length, pnls: trades.filter(t=>t.pnl!=null).map(t=>t.pnl).slice(-50) })}
    />
  );
}