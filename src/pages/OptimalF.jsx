import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Target } from 'lucide-react';

export default function OptimalF() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && t.entry_price);
    if (closed.length < 5) return [{ label: 'Optimal F', value: 'N/A' }];
    const pnls = closed.map(t => t.pnl);
    const maxLoss = Math.min(...pnls);
    const maxLossAbs = Math.abs(maxLoss);
    if (maxLossAbs === 0) return [{ label: 'Optimal F', value: 'N/A — pas de perte' }];
    let bestF = 0, bestTWR = -Infinity;
    for (let f = 0.01; f <= 0.99; f += 0.01) {
      let twr = 1;
      for (const p of pnls) {
        twr *= 1 + (p / maxLossAbs) * f;
      }
      if (twr > bestTWR) { bestTWR = twr; bestF = f; }
    }
    const kellyF = (() => {
      const wins = pnls.filter(p => p > 0);
      const losses = pnls.filter(p => p < 0);
      if (wins.length === 0 || losses.length === 0) return 0;
      const winRate = wins.length / pnls.length;
      const avgWin = wins.reduce((a, b) => a + b, 0) / wins.length;
      const avgLoss = Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length);
      return avgLoss > 0 ? winRate - (1 - winRate) / (avgWin / avgLoss) : 0;
    })();
    const secureF = bestF * 0.5;
    return [
      { label: 'Optimal f', value: (bestF * 100).toFixed(1) + '%', color: bestF > 0.1 ? 'text-primary' : 'text-yellow-400' },
      { label: 'TWR', value: bestTWR.toFixed(3), color: bestTWR > 1 ? 'text-primary' : 'text-red-400' },
      { label: 'Kelly %', value: (kellyF * 100).toFixed(1) + '%', color: kellyF > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Secure f', value: (secureF * 100).toFixed(1) + '%', color: 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [];
    const maxLoss = Math.abs(Math.min(...pnls));
    if (maxLoss === 0) return [];
    const results = [];
    for (let f = 0.05; f <= 0.95; f += 0.05) {
      let twr = 1;
      for (const p of pnls) twr *= 1 + (p / maxLoss) * f;
      results.push({ name: `${(f * 100).toFixed(0)}%`, value: twr });
    }
    return results;
  };

  return (
    <QuantPage
      title="Optimal f (Ralph Vince)"
      subtitle="Fraction optimale de capital à risquer selon Ralph Vince"
      icon={Target}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'TWR vs f% — recherche du maximum' }}
      aiPrompt="Analyse l'optimal f de Ralph Vince. C'est la fraction de capital qui maximise le Terminal Wealth Ratio (TWR). Attention: optimal f est très agressif et peut causer des drawdowns profonds. Utilisez secure f (50% de optimal f) en pratique. Comparez avec Kelly pour validation."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Optimal f</strong>: maximise TWR = ∏(1 + (Rᵢ/|MaxLoss|) × f)</p>
        <p><strong className="text-foreground">Secure f</strong> = 50% × optimal f — version prudente</p>
      </div>
    </QuantPage>
  );
}