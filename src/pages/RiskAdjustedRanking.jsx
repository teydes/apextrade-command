import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Layers3 } from 'lucide-react';

export default function RiskAdjustedRanking() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'Ranking', value: 'N/A' }];
    const bySymbol = {};
    for (const t of closed) {
      const s = t.symbol || 'UNKNOWN';
      if (!bySymbol[s]) bySymbol[s] = [];
      bySymbol[s].push(t.pnl || 0);
    }
    const rankings = Object.entries(bySymbol).map(([symbol, pnls]) => {
      const total = pnls.reduce((a, b) => a + b, 0);
      const mean = total / pnls.length;
      const variance = pnls.length > 1 ? pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (pnls.length - 1) : 0;
      const std = Math.sqrt(variance);
      const sharpe = std > 0 ? mean / std : 0;
      const winRate = pnls.filter(p => p > 0).length / pnls.length;
      const score = sharpe * 40 + winRate * 30 + Math.min(Math.abs(mean) * 0.1, 30);
      return { symbol, total, sharpe, winRate, score, count: pnls.length };
    }).sort((a, b) => b.score - a.score);
    const best = rankings[0];
    const worst = rankings[rankings.length - 1];
    return [
      { label: 'Best Symbol', value: best.symbol, color: 'text-primary' },
      { label: 'Best Score', value: best.score.toFixed(0), color: 'text-primary' },
      { label: 'Worst Symbol', value: worst.symbol, color: 'text-red-400' },
      { label: 'Symbols Ranked', value: rankings.length.toString(), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const bySymbol = {};
    for (const t of closed) {
      const s = t.symbol || 'UNKNOWN';
      if (!bySymbol[s]) bySymbol[s] = [];
      bySymbol[s].push(t.pnl || 0);
    }
    return Object.entries(bySymbol).map(([symbol, pnls]) => {
      const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
      const variance = pnls.length > 1 ? pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (pnls.length - 1) : 0;
      const std = Math.sqrt(variance);
      const sharpe = std > 0 ? mean / std : 0;
      return { name: symbol, value: sharpe };
    }).sort((a, b) => b.value - a.value).slice(0, 10);
  };

  return (
    <QuantPage
      title="Risk-Adjusted Ranking"
      subtitle="Classement des symboles par score risque-adjusté (Sharpe × 40 + WR × 30)"
      icon={Layers3}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Sharpe par symbole', refLine: 0 }}
      aiPrompt="Analyse le classement risque-adjusté. Chaque symbole est noté sur 100 (Sharpe 40 + Win Rate 30 + PnL moyen 30). Le meilleur symbole devrait recevoir plus de capital. Le pire devrait être réduit ou éliminé. Vérifie que le classement est basé sur assez de trades (> 5 par symbole)."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Score</strong> = Sharpe × 40 + Win Rate × 30 + |PnL mean| × 0.1 (max 30)</p>
        <p>Le classement risque-adjusté guide l'allocation de capital optimale.</p>
      </div>
    </QuantPage>
  );
}