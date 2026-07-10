import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Percent } from 'lucide-react';

export default function GainToPainRatio() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 3) return [{ label: 'G/P Ratio', value: 'N/A' }];
    const gains = closed.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const losses = Math.abs(closed.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    const gpr = losses > 0 ? gains / losses : gains > 0 ? Infinity : 0;
    const payoff = (() => {
      const wins = closed.filter(t => t.pnl > 0);
      const losses = closed.filter(t => t.pnl < 0);
      const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
      const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 1;
      return avgWin / avgLoss;
    })();
    return [
      { label: 'Gain/Pain', value: isFinite(gpr) ? gpr.toFixed(3) : '∞', color: gpr > 1.5 ? 'text-primary' : gpr > 1 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'Payoff Ratio', value: payoff.toFixed(2), color: payoff > 1 ? 'text-primary' : 'text-red-400' },
      { label: 'Total Gains', value: gains.toFixed(2), color: 'text-primary' },
      { label: 'Total Losses', value: losses.toFixed(2), color: 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumGains = 0, cumLosses = 0;
    return closed.slice(-40).map((t, i) => {
      if ((t.pnl || 0) > 0) cumGains += t.pnl;
      else cumLosses += Math.abs(t.pnl || 0);
      return { name: `T${i + 1}`, Gains: cumGains, Losses: cumLosses };
    });
  };

  return (
    <QuantPage
      title="Gain-to-Pain Ratio"
      subtitle="Gains cumulés / pertes cumulées (efficacité brute)"
      icon={Percent}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Cumul Gains vs Pertes' }}
      dataKey="Gains"
      aiPrompt="Analyse le Gain-to-Pain Ratio. GPR > 1.5 = excellent (on gagne 1.5× plus qu'on perd). 1.0-1.5 = acceptable. < 1.0 = on perd plus qu'on gagne. Le Payoff Ratio (avg win/avg loss) complète en mesurant la taille moyenne."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Gain-to-Pain</strong> = Σ Gains / Σ |Pertes|</p>
        <p><strong className="text-foreground">Payoff Ratio</strong> = Gain moyen / Perte moyenne</p>
      </div>
    </QuantPage>
  );
}