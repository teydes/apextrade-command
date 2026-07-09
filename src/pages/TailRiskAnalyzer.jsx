import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { AlertTriangle } from 'lucide-react';

export default function TailRiskAnalyzer() {
  const metrics = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl).sort((a,b)=>a-b);
    if (!pnls.length) return [];
    const mean = pnls.reduce((a,b)=>a+b,0) / pnls.length;
    const var95 = pnls[Math.floor(pnls.length * 0.05)];
    const var99 = pnls[Math.floor(pnls.length * 0.01)];
    const tail = pnls.slice(0, Math.max(Math.floor(pnls.length * 0.05), 1));
    const cvar95 = tail.reduce((a,b)=>a+b,0) / tail.length;
    const maxLoss = Math.min(...pnls);
    const skewness = pnls.length > 2 ? (() => {
      const std = Math.sqrt(pnls.reduce((a,b)=>a+(b-mean)**2,0)/pnls.length);
      return std ? pnls.reduce((a,b)=>a+((b-mean)/std)**3,0)/pnls.length : 0;
    })() : 0;
    return [
      { label: 'VaR 95%', value: `${var95?.toFixed(0)}€`, color: 'text-yellow-400' },
      { label: 'VaR 99%', value: `${var99?.toFixed(0)}€`, color: 'text-destructive' },
      { label: 'CVaR 95%', value: `${cvar95.toFixed(0)}€`, color: 'text-destructive' },
      { label: 'Skewness', value: skewness.toFixed(2), color: skewness < 0 ? 'text-destructive' : 'text-primary' },
    ];
  };

  const chartData = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl).sort((a,b)=>a-b);
    if (!pnls.length) return [];
    const bins = [];
    const min = Math.min(...pnls), max = Math.max(...pnls);
    const step = (max - min) / 8 || 1;
    for (let i = 0; i < 8; i++) {
      const lo = min + i * step;
      const count = pnls.filter(p => p >= lo && p < lo + step).length;
      bins.push({ name: `${lo.toFixed(0)}`, value: count });
    }
    return bins;
  };

  const aiPrompt = "Analyse le risque extrême (tail risk) de ce portefeuille. Évalue la VaR, CVaR, le skewness. Identifie si la distribution est à queue épaisse. Recommande des stratégies de hedging et de réduction du risque extrême.";

  return (
    <QuantPage
      title="Tail Risk Analyzer"
      subtitle="Value at Risk, Conditional VaR, skewness, kurtosis"
      icon={AlertTriangle}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Distribution des PnL (Tail Risk)' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify({ pnls: trades.filter(t=>t.pnl!=null).map(t=>t.pnl).sort((a,b)=>a-b).slice(0,200), count: trades.length })}
    />
  );
}