import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { GitCompare } from 'lucide-react';

export default function BenchmarkAlpha() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 10) return [{ label: 'Alpha', value: 'N/A' }];
    const n = pnls.length;
    const meanPnl = pnls.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - meanPnl, 2), 0) / (n - 1));
    const benchmarkReturn = 0.5;
    const alpha = meanPnl - benchmarkReturn;
    const alphaPct = meanPnl !== 0 ? (alpha / Math.abs(meanPnl)) * 100 : 0;
    const trackingError = std;
    const infoRatio = trackingError > 0 ? alpha / trackingError : 0;
    const beatBenchmark = alpha > 0;
    return [
      { label: 'Alpha', value: alpha.toFixed(2), color: alpha > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Alpha %', value: alphaPct.toFixed(0) + '%', color: alphaPct > 10 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Info Ratio', value: infoRatio.toFixed(3), color: infoRatio > 0.5 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Beat Bench.', value: beatBenchmark ? 'Oui' : 'Non', color: beatBenchmark ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumulAlpha = 0, cumulBench = 0;
    const benchPerTrade = 0.5;
    return closed.slice(-50).map((t, i) => {
      cumulAlpha += t.pnl || 0;
      cumulBench += benchPerTrade;
      return { name: `T${i + 1}`, Strategy: cumulAlpha, Benchmark: cumulBench };
    });
  };

  return (
    <QuantPage
      title="Benchmark Alpha Analysis"
      subtitle="Alpha vs benchmark: la stratégie bat-elle le benchmark?"
      icon={GitCompare}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Stratégie vs Benchmark cumulé' }}
      dataKey="Strategy"
      aiPrompt="Analyse l'alpha vs benchmark. L'alpha est la surperformance par rapport au benchmark (ici un rendement passif de référence). Un alpha positif = la stratégie ajoute de la valeur. L'Information Ratio (alpha / tracking error) mesure la qualité de cet alpha: > 0.5 = bon, > 1.0 = excellent."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, strategy: t.strategy, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Alpha</strong> = R(stratégie) − R(benchmark)</p>
        <p><strong className="text-foreground">Info Ratio</strong> = Alpha / Tracking Error — qualité de l'alpha</p>
      </div>
    </QuantPage>
  );
}