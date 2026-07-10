import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Waves } from 'lucide-react';

export default function KurtosisRisk() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 8) return [{ label: 'Kurtosis Risk', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const variance = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1);
    const std = Math.sqrt(variance);
    const kurt = std > 0 ? (pnls.reduce((s, p) => s + Math.pow(p - mean, 4), 0) / (n * Math.pow(std, 4))) - 3 : 0;
    const fatTailRisk = kurt > 3 ? 'Critique' : kurt > 1 ? 'Élevé' : kurt > 0 ? 'Modéré' : 'Faible';
    const extremeThreshold = mean - 3 * std;
    const extremeLosses = pnls.filter(p => p < extremeThreshold).length;
    return [
      { label: 'Excess Kurtosis', value: kurt.toFixed(3), color: kurt < 1 ? 'text-primary' : kurt > 3 ? 'text-red-400' : 'text-yellow-400' },
      { label: 'Fat Tail Risk', value: fatTailRisk, color: kurt > 3 ? 'text-red-400' : kurt > 1 ? 'text-yellow-400' : 'text-primary' },
      { label: '3σ Events', value: extremeLosses.toString(), color: extremeLosses > 2 ? 'text-red-400' : 'text-foreground' },
      { label: 'Tail Risk Multiplier', value: (1 + kurt * 0.1).toFixed(2) + '×', color: 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 8) return [];
    const min = Math.min(...pnls), max = Math.max(...pnls);
    const range = max - min || 1;
    const bins = 20;
    const counts = new Array(bins).fill(0);
    for (const p of pnls) {
      const idx = Math.min(Math.floor(((p - min) / range) * bins), bins - 1);
      counts[idx]++;
    }
    return counts.map((c, i) => ({ name: (min + (range / bins) * i).toFixed(0), value: c }));
  };

  return (
    <QuantPage
      title="Kurtosis Risk Analysis"
      subtitle="Risque de queues épaisses et événements extrêmes (black swan)"
      icon={Waves}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Distribution avec queues épaisses' }}
      aiPrompt="Analyse le risque de kurtosis. Une kurtosis > 3 (excès) indique des queues épaisses: les événements extrêmes sont plus fréquents que la normale. Le VaR classique sous-estime alors le risque. Le multiplicateur de tail risk ajuste le capital de sécurité. Les events 3σ doivent être rares (< 2)."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Excess Kurtosis</strong> &gt; 3 → queues très épaisses (black swan fréquent)</p>
        <p>Le multiplicateur de tail risk ajuste le capital de réserve selon l'épaisseur des queues.</p>
      </div>
    </QuantPage>
  );
}