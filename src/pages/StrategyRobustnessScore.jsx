import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { ShieldCheck } from 'lucide-react';

export default function StrategyRobustnessScore() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 15) return [{ label: 'Robustness', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1));
    const sharpe = std > 0 ? mean / std : 0;
    const tStat = std > 0 ? mean / (std / Math.sqrt(n)) : 0;
    const quarter = Math.floor(n / 4);
    const means = [0, 1, 2, 3].map(i => {
      const slice = pnls.slice(i * quarter, (i + 1) * quarter);
      return slice.reduce((a, b) => a + b, 0) / Math.max(slice.length, 1);
    });
    const consistency = Math.abs(means[0]) > 0 ? Math.min(Math.abs(means[3] / means[0]), 2) : 0;
    const positiveQuarters = means.filter(m => m > 0).length;
    let cumul = 0, peak = 0, maxDD = 0;
    for (const p of pnls) { cumul += p; if (cumul > peak) peak = cumul; const dd = peak - cumul; if (dd > maxDD) maxDD = dd; }
    const totalPnl = pnls.reduce((a, b) => a + b, 0);
    const recoveryFactor = maxDD > 0 ? totalPnl / maxDD : 0;
    const sampleScore = Math.min(n / 50, 1) * 25;
    const sigScore = Math.abs(tStat) > 1.96 ? 25 : Math.abs(tStat) > 1.0 ? 15 : 0;
    const consScore = (positiveQuarters / 4) * 25;
    const recScore = Math.min(recoveryFactor / 5, 1) * 25;
    const robustness = sampleScore + sigScore + consScore + recScore;
    return [
      { label: 'Robustness', value: robustness.toFixed(0) + '/100', color: robustness > 70 ? 'text-primary' : robustness > 50 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'Sample', value: sampleScore.toFixed(0) + '/25', color: 'text-foreground' },
      { label: 'Significance', value: sigScore.toFixed(0) + '/25', color: sigScore > 15 ? 'text-primary' : 'text-red-400' },
      { label: 'Recovery', value: recScore.toFixed(0) + '/25', color: recScore > 15 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 15) return [];
    const quarter = Math.floor(pnls.length / 4);
    return [
      { name: 'Sample', value: Math.min(pnls.length / 50, 1) * 25 },
      { name: 'Sig.', value: Math.abs(pnls.reduce((a, b) => a + b, 0) / pnls.length / (Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - pnls.reduce((a, b) => a + b, 0) / pnls.length, 2), 0) / (pnls.length - 1)) / Math.sqrt(pnls.length))) > 1.96 ? 25 : 12 },
      { name: 'Consist.', value: [0, 1, 2, 3].filter(i => pnls.slice(i * quarter, (i + 1) * quarter).reduce((a, b) => a + b, 0) > 0).length / 4 * 25 },
      { name: 'Recovery', value: 20 },
    ];
  };

  return (
    <QuantPage
      title="Strategy Robustness Score"
      subtitle="Score composite /100: échantillon + significativité + consistance + recovery"
      icon={ShieldCheck}
      metrics={metrics}
      chartData={chartData}
      chartType="radar"
      chartConfig={{ title: 'Score de robustesse (radar)' }}
      aiPrompt="Analyse le score de robustesse. C'est un score composite sur 100 combinant 4 dimensions: taille d'échantillon (25), significativité statistique (25), consistance inter-quartile (25), et facteur de recovery (25). > 70 = stratégie robuste et fiable. 50-70 = acceptable mais perfectible. < 50 = fragile, risque d'overfit."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, strategy: t.strategy })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Robustness</strong> = Sample (25) + Significance (25) + Consistency (25) + Recovery (25)</p>
        <p>Le score de robustesse est le test final avant de déployer une stratégie en live.</p>
      </div>
    </QuantPage>
  );
}