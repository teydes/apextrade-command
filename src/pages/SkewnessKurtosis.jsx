import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { BarChart2 } from 'lucide-react';

export default function SkewnessKurtosis() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'Skew', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const variance = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1);
    const std = Math.sqrt(variance);
    const skew = pnls.reduce((s, p) => s + Math.pow(p - mean, 3), 0) / (n * Math.pow(std, 3));
    const kurt = (pnls.reduce((s, p) => s + Math.pow(p - mean, 4), 0) / (n * Math.pow(std, 4))) - 3;
    const jb = (n / 6) * (skew * skew + (kurt * kurt) / 4);
    const isNormal = jb < 5.99;
    return [
      { label: 'Skewness', value: skew.toFixed(3), color: skew > -0.5 && skew < 0.5 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Kurtosis (excès)', value: kurt.toFixed(3), color: kurt < 3 ? 'text-primary' : 'text-red-400' },
      { label: 'Jarque-Bera', value: jb.toFixed(2), color: isNormal ? 'text-primary' : 'text-red-400' },
      { label: 'Normalité', value: isNormal ? 'Oui (p>5%)' : 'Non (p<5%)', color: isNormal ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [];
    const min = Math.min(...pnls), max = Math.max(...pnls);
    const range = max - min || 1;
    const bins = 10;
    const counts = new Array(bins).fill(0);
    for (const p of pnls) {
      const idx = Math.min(Math.floor(((p - min) / range) * bins), bins - 1);
      counts[idx]++;
    }
    return counts.map((c, i) => ({ name: (min + (range / bins) * i).toFixed(0), value: c }));
  };

  return (
    <QuantPage
      title="Skewness & Kurtosis"
      subtitle="Analyse de la forme de la distribution des rendements"
      icon={BarChart2}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Histogramme des PnL' }}
      aiPrompt="Analyse la skewness et kurtosis. Skew négatif = queue de perte (dangereux). Kurtosis élevé = distributions à queues épaisses (risque de perte extrême). Le test de Jarque-Bera vérifie la normalité. Explique les implications pour le risk management."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Skewness</strong> &lt; 0 → queue de perte (left-skewed, dangereux)</p>
        <p><strong className="text-foreground">Kurtosis</strong> &gt; 0 → queues épaisses (risque extrême élevé)</p>
        <p><strong className="text-foreground">Jarque-Bera</strong> &gt; 5.99 → distribution non-normale (Sharpe biaisé)</p>
      </div>
    </QuantPage>
  );
}