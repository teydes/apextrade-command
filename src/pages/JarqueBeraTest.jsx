import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { BarChart2 } from 'lucide-react';

export default function JarqueBeraTest() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 8) return [{ label: 'JB Test', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const m2 = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / n;
    const m3 = pnls.reduce((s, p) => s + Math.pow(p - mean, 3), 0) / n;
    const m4 = pnls.reduce((s, p) => s + Math.pow(p - mean, 4), 0) / n;
    const skewness = m2 > 0 ? m3 / Math.pow(m2, 1.5) : 0;
    const kurtosis = m2 > 0 ? m4 / Math.pow(m2, 2) - 3 : 0;
    const jb = n > 0 ? (n / 6) * (Math.pow(skewness, 2) + Math.pow(kurtosis, 2) / 4) : 0;
    const isNormal = jb < 5.99;
    return [
      { label: 'JB Statistic', value: jb.toFixed(3), color: isNormal ? 'text-primary' : 'text-yellow-400' },
      { label: 'Normalité', value: isNormal ? 'Oui (95%)' : 'Non', color: isNormal ? 'text-primary' : 'text-red-400' },
      { label: 'Skewness', value: skewness.toFixed(3), color: Math.abs(skewness) < 0.5 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Excess Kurtosis', value: kurtosis.toFixed(3), color: Math.abs(kurtosis) < 1 ? 'text-primary' : 'text-red-400' },
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
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / n);
    const normalCounts = Array.from({ length: bins }, (_, i) => {
      const x = min + (range / bins) * (i + 0.5);
      return std > 0 ? n * (range / bins) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2)) / (std * Math.sqrt(2 * Math.PI)) : 0;
    });
    return counts.map((c, i) => ({ name: (min + (range / bins) * i).toFixed(0), Empirical: c, Normal: normalCounts[i].toFixed(1) }));
  };

  return (
    <QuantPage
      title="Jarque-Bera Normality Test"
      subtitle="Test de normalité de la distribution des PnL"
      icon={BarChart2}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Distribution empirique vs normale' }}
      aiPrompt="Analyse le test de Jarque-Bera. JB < 5.99 = distribution normale (95%). Si non normale, les métriques comme le VaR paramétrique et le Sharpe peuvent être trompeurs. Une skewness négative = pertes extrêmes. Une kurtosis élevée = queues épaisses. Adapte le risque en conséquence."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">JB</strong> = (n/6) × (S² + K²/4) — suit χ²(2)</p>
        <p>JB &lt; 5.99 = distribution normale au seuil de 5%.</p>
      </div>
    </QuantPage>
  );
}