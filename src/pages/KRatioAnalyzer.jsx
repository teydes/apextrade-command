import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function KRatioAnalyzer() {
  const metrics = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (pnls.length < 3) return [];
    let cumSum = 0;
    const equity = pnls.map((p, i) => { cumSum += p; return { x: i + 1, y: cumSum }; });
    const n = equity.length;
    const sumX = equity.reduce((a,e)=>a+e.x, 0);
    const sumY = equity.reduce((a,e)=>a+e.y, 0);
    const sumXY = equity.reduce((a,e)=>a+e.x*e.y, 0);
    const sumX2 = equity.reduce((a,e)=>a+e.x*e.x, 0);
    const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
    const intercept = (sumY - slope*sumX) / n;
    const yPred = equity.map(e => slope*e.x + intercept);
    const ssRes = equity.reduce((a,e,i)=>a+(e.y - yPred[i])**2, 0);
    const yMean = sumY / n;
    const ssTot = equity.reduce((a,e)=>a+(e.y - yMean)**2, 0);
    const r2 = ssTot ? 1 - ssRes/ssTot : 0;
    const stdErr = Math.sqrt(ssRes / Math.max(n-2, 1));
    const kRatio = stdErr ? slope / stdErr : 0;
    return [
      { label: 'K-Ratio', value: kRatio.toFixed(3), color: kRatio > 2 ? 'text-primary' : kRatio > 0.5 ? 'text-blue-400' : 'text-destructive' },
      { label: 'R² (Linéarité)', value: r2.toFixed(3), color: r2 > 0.8 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Slope', value: slope.toFixed(2), color: slope > 0 ? 'text-primary' : 'text-destructive' },
      { label: 'Std Error', value: stdErr.toFixed(2), color: 'text-muted-foreground' },
    ];
  };

  const chartData = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    let cumSum = 0;
    return pnls.map((p, i) => { cumSum += p; return { name: `T${i+1}`, value: cumSum }; });
  };

  const aiPrompt = "Analyse le K-Ratio qui mesure la linéarité et la consistance de la courbe d'équity. Un K-Ratio élevé (>2) indique une croissance régulière et prévisible. Évalue la qualité de la courbe d'équity et recommande des améliorations pour augmenter la linéarité.";

  return (
    <QuantPage
      title="K-Ratio Analyzer"
      subtitle="Linéarité de la courbe d'équity, consistance"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity Curve (Linéarité)' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify({ pnls: trades.filter(t=>t.pnl!=null).map(t=>t.pnl) })}
    />
  );
}