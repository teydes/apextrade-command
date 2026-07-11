import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { AlertTriangle } from 'lucide-react';

export default function OverfitRiskScore() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 10) return [{ label: 'Overfit Risk', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1));
    const sharpe = std > 0 ? mean / std : 0;
    const quarter = Math.floor(n / 4);
    const q1 = pnls.slice(0, quarter);
    const q4 = pnls.slice(-quarter);
    const meanQ1 = q1.reduce((a, b) => a + b, 0) / Math.max(q1.length, 1);
    const meanQ4 = q4.reduce((a, b) => a + b, 0) / Math.max(q4.length, 1);
    const decayPct = meanQ1 !== 0 ? Math.abs((meanQ1 - meanQ4) / Math.abs(meanQ1)) * 100 : 0;
    const sampleScore = Math.min(n / 100, 1) * 30;
    const consistencyScore = decayPct < 30 ? 30 : decayPct < 60 ? 15 : 0;
    const sharpeScore = Math.abs(sharpe) < 3 ? 20 : Math.abs(sharpe) < 5 ? 10 : 0;
    const robustnessScore = sampleScore + consistencyScore + sharpeScore;
    const overfitRisk = 100 - robustnessScore;
    return [
      { label: 'Overfit Risk', value: overfitRisk.toFixed(0) + '/100', color: overfitRisk < 30 ? 'text-primary' : overfitRisk < 60 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'Sample Size', value: n.toString(), color: n > 50 ? 'text-primary' : 'text-red-400' },
      { label: 'Decay %', value: decayPct.toFixed(0) + '%', color: decayPct < 30 ? 'text-primary' : 'text-red-400' },
      { label: 'Sharpe', value: sharpe.toFixed(2), color: Math.abs(sharpe) < 3 ? 'text-primary' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 10) return [];
    const quarter = Math.floor(pnls.length / 4);
    const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return [
      { name: 'Q1', value: avg(pnls.slice(0, quarter)) },
      { name: 'Q2', value: avg(pnls.slice(quarter, quarter * 2)) },
      { name: 'Q3', value: avg(pnls.slice(quarter * 2, quarter * 3)) },
      { name: 'Q4', value: avg(pnls.slice(quarter * 3)) },
    ];
  };

  return (
    <QuantPage
      title="Overfit Risk Score"
      subtitle="Score composite de risque d'overfitting (taille échantillon, consistance, Sharpe)"
      icon={AlertTriangle}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Performance par quartile (consistance)', refLine: 0 }}
      aiPrompt="Analyse le risque d'overfit. Un score supérieur à 60 = probabilité élevée d'overfitting. Les signaux d'alerte: peu de trades (moins de 30), decay important entre Q1 et Q4, Sharpe anormalement élevé (supérieur à 3). Un score inférieur à 30 = stratégie probablement robuste. Le decay entre Q1 et Q4 est le meilleur signal d'overfit."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, strategy: t.strategy })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Overfit Risk</strong> = 100 − (Sample + Consistency + Sharpe scores)</p>
        <p>Un Sharpe supérieur à 3 avec peu de trades est un signal classique d'overfitting.</p>
      </div>
    </QuantPage>
  );
}