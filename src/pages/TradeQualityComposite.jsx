import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Award } from 'lucide-react';

export default function TradeQualityComposite() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'Quality', value: 'N/A' }];
    const pnls = closed.map(t => t.pnl);
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    const winRate = wins.length / pnls.length;
    const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 1;
    const payoff = avgWin / Math.max(avgLoss, 0.01);
    const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;
    let cumul = 0, peak = 0, maxDD = 0;
    for (const p of pnls) {
      cumul += p;
      if (cumul > peak) peak = cumul;
      const dd = peak - cumul;
      if (dd > maxDD) maxDD = dd;
    }
    const totalPnl = pnls.reduce((a, b) => a + b, 0);
    const sharpe = pnls.length > 1 ? (() => {
      const m = totalPnl / pnls.length;
      const v = pnls.reduce((s, p) => s + Math.pow(p - m, 2), 0) / (pnls.length - 1);
      return v > 0 ? m / Math.sqrt(v) : 0;
    })() : 0;
    const consistency = maxDD > 0 ? Math.min((totalPnl / maxDD) * 10, 100) : 50;
    const discipline = closed.filter(t => t.risk_reward != null).length / closed.length;
    const qualityScore = Math.max(0, Math.min(100,
      winRate * 20 + Math.min(payoff * 15, 25) + Math.min(Math.abs(expectancy) * 2, 20) +
      Math.min(Math.abs(sharpe) * 10, 15) + consistency * 0.1 + discipline * 10
    ));
    return [
      { label: 'Quality Score', value: qualityScore.toFixed(0) + '/100', color: qualityScore > 70 ? 'text-primary' : qualityScore > 50 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'Expectancy', value: expectancy.toFixed(2), color: expectancy > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Payoff', value: payoff.toFixed(2), color: payoff > 1 ? 'text-primary' : 'text-red-400' },
      { label: 'Discipline', value: (discipline * 100).toFixed(0) + '%', color: discipline > 0.7 ? 'text-primary' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    return [
      { name: 'Wins', value: closed.filter(t => t.pnl > 0).length },
      { name: 'Losses', value: closed.filter(t => t.pnl < 0).length },
      { name: 'BE', value: closed.filter(t => t.pnl === 0).length },
    ];
  };

  return (
    <QuantPage
      title="Trade Quality Composite"
      subtitle="Score composite /100 combinant win rate, payoff, expectancy, Sharpe, discipline"
      icon={Award}
      metrics={metrics}
      chartData={chartData}
      chartType="pie"
      chartConfig={{ title: 'Distribution Win/Loss/BE' }}
      aiPrompt="Analyse le Trade Quality Composite Score. C'est un score global qui combine 6 dimensions: win rate, payoff ratio, expectancy, Sharpe, consistance (PnL/maxDD), et discipline (R:R renseigné). > 70 = excellent trader, 50-70 = acceptable, < 50 = amélioration nécessaire. Identifie la dimension la plus faible."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, risk_reward: t.risk_reward, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Quality Score</strong> = Win Rate (20) + Payoff (25) + Expectancy (20) + Sharpe (15) + Consistency (10) + Discipline (10)</p>
        <p>Score composite pondéré sur 100 points évaluant la qualité globale du trading.</p>
      </div>
    </QuantPage>
  );
}