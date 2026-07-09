import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Shield } from 'lucide-react';

export default function SortinoCalculator() {
  const metrics = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    const mean = pnls.reduce((a,b)=>a+b,0) / pnls.length;
    const downside = pnls.filter(p => p < 0);
    const downsideDev = downside.length ? Math.sqrt(downside.reduce((a,b)=>a+b*b,0)/downside.length) : 0;
    const std = Math.sqrt(pnls.reduce((a,b)=>a+(b-mean)**2,0)/pnls.length);
    const sharpe = std ? mean/std : 0;
    const sortino = downsideDev ? mean/downsideDev : 0;
    const annualized = sortino * Math.sqrt(252);
    return [
      { label: 'Sortino Ratio', value: sortino.toFixed(2), color: sortino > 1 ? 'text-primary' : 'text-destructive' },
      { label: 'Sharpe Ratio', value: sharpe.toFixed(2), color: sharpe > 1 ? 'text-primary' : 'text-destructive' },
      { label: 'Annualized Sortino', value: annualized.toFixed(2), color: 'text-blue-400' },
      { label: 'Downside Dev', value: downsideDev.toFixed(2), color: 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    const mean = pnls.reduce((a,b)=>a+b,0) / pnls.length;
    const downsideDev = Math.sqrt(pnls.filter(p=>p<0).reduce((a,b)=>a+b*b,0) / Math.max(pnls.filter(p=>p<0).length,1));
    const bins = [];
    for (let i = 0; i < 10; i++) {
      const lo = mean - (5-i)*downsideDev;
      const hi = mean + (i-4)*downsideDev;
      const count = pnls.filter(p => p >= lo && p < hi + 0.01).length;
      bins.push({ name: `${(lo).toFixed(0)}`, value: count });
    }
    return bins;
  };

  const aiPrompt = "Analyse le ratio de Sortino et le risque baissier de ce portefeuille de trading. Compare Sortino vs Sharpe, évalue la qualité de la gestion du risque baissier, et recommande des améliorations spécifiques pour réduire la downside deviation.";

  return (
    <QuantPage
      title="Sortino Calculator"
      subtitle="Ratio de Sortino, downside deviation, risque baissier"
      icon={Shield}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Distribution des PnL vs Downside Dev' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify(trades.filter(t=>t.pnl!=null).map(t=>({pnl:t.pnl,symbol:t.symbol,result:t.result})).slice(0,100))}
    />
  );
}