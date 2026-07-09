import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Sigma } from 'lucide-react';

export default function OmegaRatio() {
  const metrics = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    const threshold = 0;
    const gains = pnls.filter(p => p > threshold);
    const losses = pnls.filter(p => p < threshold);
    const sumGains = gains.reduce((a,b)=>a+b, 0);
    const sumLosses = Math.abs(losses.reduce((a,b)=>a+b, 0));
    const omega = sumLosses ? sumGains / sumLosses : 0;
    const winProb = gains.length / pnls.length;
    const lossProb = losses.length / pnls.length;
    const omegaFromProb = lossProb ? winProb / lossProb : 0;
    return [
      { label: 'Omega Ratio', value: omega.toFixed(2), color: omega > 1 ? 'text-primary' : 'text-destructive' },
      { label: 'Sum Gains', value: `${sumGains.toFixed(0)}€`, color: 'text-primary' },
      { label: 'Sum Losses', value: `${sumLosses.toFixed(0)}€`, color: 'text-destructive' },
      { label: 'Win/Loss Prob', value: omegaFromProb.toFixed(2), color: 'text-blue-400' },
    ];
  };

  const chartData = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl).sort((a,b)=>a-b);
    if (!pnls.length) return [];
    const thresholds = [-200, -100, -50, 0, 50, 100, 200];
    return thresholds.map(th => {
      const gains = pnls.filter(p => p > th).reduce((a,b)=>a+b, 0);
      const losses = Math.abs(pnls.filter(p => p < th).reduce((a,b)=>a+b, 0));
      return { name: `${th}`, value: losses ? gains/losses : 0 };
    });
  };

  const aiPrompt = "Analyse le ratio d'Omega à différents seuils. L'Omega > 1 indique plus de gains que de pertes. Évalue la probabilité de gain vs perte et la qualité asymétrique du portefeuille. Recommande des ajustements pour améliorer le ratio.";

  return (
    <QuantPage
      title="Omega Ratio"
      subtitle="Ratio probabilité-pondéré gains/pertes"
      icon={Sigma}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Omega par seuil', refLine: 1 }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify({ pnls: trades.filter(t=>t.pnl!=null).map(t=>t.pnl).slice(-100) })}
    />
  );
}