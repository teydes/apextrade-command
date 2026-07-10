import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { DollarSign } from 'lucide-react';

export default function ProfitConsistency() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'Consistency', value: 'N/A' }];
    const totalPnl = pnls.reduce((a, b) => a + b, 0);
    const n = pnls.length;
    const mean = totalPnl / n;
    const positive = pnls.filter(p => p > 0);
    const negative = pnls.filter(p => p < 0);
    const avgWin = positive.length > 0 ? positive.reduce((a, b) => a + b, 0) / positive.length : 0;
    const avgLoss = negative.length > 0 ? Math.abs(negative.reduce((a, b) => a + b, 0) / negative.length) : 0;
    const variance = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1);
    const cv = mean > 0 ? Math.sqrt(variance) / Math.abs(mean) : Infinity;
    const consistencyScore = Math.max(0, Math.min(100, isFinite(cv) ? 100 - cv * 20 : 0));
    const profitMonths = Math.ceil(n / 4);
    const positiveQuarters = Math.ceil(positive.length / Math.max(n, 1) * 4);
    return [
      { label: 'Consistency', value: consistencyScore.toFixed(0) + '/100', color: consistencyScore > 70 ? 'text-primary' : consistencyScore > 40 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'Coeff Variation', value: isFinite(cv) ? cv.toFixed(2) : '∞', color: cv < 2 ? 'text-primary' : 'text-red-400' },
      { label: 'Win/Loss Ratio', value: (avgWin / Math.max(avgLoss, 0.01)).toFixed(2), color: avgWin > avgLoss ? 'text-primary' : 'text-red-400' },
      { label: 'Total PnL', value: totalPnl.toFixed(2), color: totalPnl >= 0 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const n = closed.length;
    if (n < 5) return [];
    const buckets = Math.min(10, Math.floor(n / 3));
    const bucketSize = Math.ceil(n / buckets);
    return Array.from({ length: buckets }, (_, i) => {
      const slice = closed.slice(i * bucketSize, (i + 1) * bucketSize);
      const sum = slice.reduce((s, t) => s + (t.pnl || 0), 0);
      return { name: `B${i + 1}`, value: sum };
    });
  };

  return (
    <QuantPage
      title="Profit Consistency Score"
      subtitle="Régularité du profit (coefficient de variation et stabilité)"
      icon={DollarSign}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'PnL par bucket temporel', refLine: 0 }}
      aiPrompt="Analyse la consistance du profit. Le coefficient de variation (CV) mesure la dispersion relative. Un CV < 1 = profit régulier. > 3 = très irrégulier. Le score de consistance combine le CV et le ratio win/loss. Une consistance élevée = revenus prévisibles."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Consistency Score</strong> = 100 − CV × 20 (CV = σ/|μ|)</p>
        <p>Un profit régulier et prévisible vaut plus qu'un profit élevé mais irrégulier.</p>
      </div>
    </QuantPage>
  );
}