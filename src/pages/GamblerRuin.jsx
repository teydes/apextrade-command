import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Skull } from 'lucide-react';

export default function GamblerRuin() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'Ruin', value: 'N/A' }];
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    const p = pnls.length > 0 ? wins.length / pnls.length : 0.5;
    const q = 1 - p;
    const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 1;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 1;
    const a = avgLoss / (avgWin + avgLoss);
    const b = avgWin / (avgWin + avgLoss);
    const totalPnl = pnls.reduce((s, p) => s + p, 0);
    const estimatedCapital = Math.max(Math.abs(totalPnl) * 5, 1000);
    const units = estimatedCapital / avgLoss;
    let ruinProb;
    if (p === q) {
      ruinProb = 1 - units / (units + units);
    } else {
      const ratio = (q / p) * (b / a);
      ruinProb = ratio >= 1 ? 1 : Math.pow(ratio, units);
    }
    ruinProb = Math.min(Math.max(ruinProb, 0), 1);
    return [
      { label: 'P(Ruin)', value: (ruinProb * 100).toFixed(2) + '%', color: ruinProb < 0.01 ? 'text-primary' : ruinProb < 0.05 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'Win Rate', value: (p * 100).toFixed(1) + '%', color: p > 0.5 ? 'text-primary' : 'text-red-400' },
      { label: 'Capital (units)', value: units.toFixed(0), color: units > 20 ? 'text-primary' : 'text-red-400' },
      { label: 'Avg Win/Loss', value: (avgWin / avgLoss).toFixed(2), color: avgWin / avgLoss > 1 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [];
    const wins = pnls.filter(p => p > 0).length;
    const losses = pnls.filter(p => p < 0).length;
    return [
      { name: 'Wins', value: wins },
      { name: 'Losses', value: losses },
    ];
  };

  return (
    <QuantPage
      title="Gambler's Ruin"
      subtitle="Probabilité de faillite complète du capital de trading"
      icon={Skull}
      metrics={metrics}
      chartData={chartData}
      chartType="pie"
      chartConfig={{ title: 'Wins vs Losses' }}
      aiPrompt="Analyse la probabilité de Gambler's Ruin. C'est la probabilité de perdre tout le capital. P(Ruin) < 1% = sécurisé, 1-5% = acceptable, > 5% = dangereux. La formule dépend du win rate, de l'avg win/loss et de la taille du capital en unités de risque."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">P(Ruin)</strong> = ((q/p) × (b/a))^n où n = capital / avg loss</p>
        <p>Le Gambler's Ruin est la probabilité de perdre tout le capital avant d'atteindre un objectif.</p>
      </div>
    </QuantPage>
  );
}