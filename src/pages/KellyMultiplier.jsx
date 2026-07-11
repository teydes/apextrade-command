import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Target } from 'lucide-react';

export default function KellyMultiplier() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'Kelly Mult.', value: 'N/A' }];
    const n = pnls.length;
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    if (wins.length === 0 || losses.length === 0) return [{ label: 'Kelly', value: 'N/A' }];
    const winRate = wins.length / n;
    const avgWin = wins.reduce((a, b) => a + b, 0) / wins.length;
    const avgLoss = Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length);
    const b = avgWin / Math.max(avgLoss, 0.01);
    const fullKelly = winRate - (1 - winRate) / b;
    const halfKelly = fullKelly * 0.5;
    const quarterKelly = fullKelly * 0.25;
    const tenthKelly = fullKelly * 0.1;
    return [
      { label: 'Full Kelly', value: (fullKelly * 100).toFixed(1) + '%', color: fullKelly > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Half Kelly', value: (halfKelly * 100).toFixed(1) + '%', color: 'text-primary' },
      { label: 'Quarter Kelly', value: (quarterKelly * 100).toFixed(1) + '%', color: 'text-yellow-400' },
      { label: 'Tenth Kelly', value: (tenthKelly * 100).toFixed(1) + '%', color: 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [];
    const n = pnls.length;
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    if (wins.length === 0 || losses.length === 0) return [];
    const winRate = wins.length / n;
    const avgWin = wins.reduce((a, b) => a + b, 0) / wins.length;
    const avgLoss = Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length);
    const b = avgWin / Math.max(avgLoss, 0.01);
    const results = [];
    for (let f = 0; f <= 1; f += 0.05) {
      const wr = f * b - (1 - f);
      results.push({ name: `${(f * 100).toFixed(0)}%`, value: wr });
    }
    return results;
  };

  return (
    <QuantPage
      title="Kelly Multiplier Analysis"
      subtitle="Fractions Kelly: full, half, quarter, tenth (gestion du risque)"
      icon={Target}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Croissance attendue vs fraction', refLine: 0 }}
      aiPrompt="Analyse les fractions Kelly. Le Kelly Criterion maximise la croissance à long terme, mais il est trop agressif. Half Kelly (50%) offre 75% de la croissance avec 50% du risque. Quarter Kelly est recommandé pour la plupart des traders. Tenth Kelly pour les débutants. Le compromis croissance/risque est la clé."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Kelly</strong> = W − (1−W)/B (W=win rate, B=avg win/loss)</p>
        <p><strong className="text-foreground">Half Kelly</strong>: 75% de la croissance, 50% du risque — recommandé</p>
      </div>
    </QuantPage>
  );
}