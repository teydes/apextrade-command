import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { TrendingDown } from 'lucide-react';

export default function SemiDeviation() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'Semi-Dev', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const negatives = pnls.filter(p => p < mean);
    const k = negatives.length;
    if (k === 0) return [
      { label: 'Semi-Deviation', value: '0.00', color: 'text-primary' },
      { label: 'Pertes', value: 'Aucune', color: 'text-primary' },
    ];
    const semiDev = Math.sqrt(negatives.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / k);
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1));
    const semiRatio = std > 0 ? semiDev / std : 0;
    const sortinoMean = Math.abs(mean) > 0 ? mean / (semiDev * Math.sqrt(n)) : 0;
    return [
      { label: 'Semi-Deviation', value: semiDev.toFixed(2), color: semiDev < Math.abs(mean) ? 'text-primary' : 'text-red-400' },
      { label: 'Semi/σ ratio', value: semiRatio.toFixed(3), color: semiRatio < 1 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Sortino (proxy)', value: sortinoMean.toFixed(3), color: sortinoMean > 0.5 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Périodes −', value: k.toString(), color: 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [];
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    return pnls.slice(-40).map((p, i) => ({
      name: `T${i + 1}`,
      value: p < mean ? p : 0,
    }));
  };

  return (
    <QuantPage
      title="Semi-Deviation (Downside Risk)"
      subtitle="Risque de baisse uniquement: dispersion des seules périodes négatives"
      icon={TrendingDown}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Périodes sous la moyenne', refLine: 0 }}
      aiPrompt="Analyse la semi-déviation. Contrairement à l'écart-type qui compte les gains comme du risque, la semi-déviation ne mesure que la dispersion des périodes sous la moyenne. C'est la base du ratio Sortino, plus pertinent que le Sharpe pour les stratégies asymétriques. Un ratio semi/σ faible = le risque est concentré dans les pertes attendues (bon signe de maîtrise du risque)."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Semi-Dev</strong> = √(Σ(Xᵢ−μ)² / k) pour les Xᵢ inférieurs à μ</p>
        <p>Le risque de baisse est ce que le trader ressent réellement: la semi-déviation le quantifie.</p>
      </div>
    </QuantPage>
  );
}