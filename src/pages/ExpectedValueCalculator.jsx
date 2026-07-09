import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Calculator } from 'lucide-react';

export default function ExpectedValueCalculator() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.result && t.pnl != null);
    if (!closed.length) return [];
    const wins = closed.filter(t => t.result === 'win');
    const losses = closed.filter(t => t.result === 'loss');
    const breakevens = closed.filter(t => t.result === 'breakeven');
    const winProb = wins.length / closed.length;
    const lossProb = losses.length / closed.length;
    const beProb = breakevens.length / closed.length;
    const avgWin = wins.length ? wins.reduce((a,t)=>a+t.pnl,0)/wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((a,t)=>a+t.pnl,0)/losses.length : 0;
    const ev = winProb * avgWin + lossProb * avgLoss + beProb * 0;
    const evPct = ev;
    return [
      { label: 'Expected Value', value: `${evPct.toFixed(2)}€`, color: ev > 0 ? 'text-primary' : 'text-destructive' },
      { label: 'Win Prob', value: `${(winProb*100).toFixed(1)}%`, color: 'text-primary' },
      { label: 'Avg Win', value: `${avgWin.toFixed(1)}€`, color: 'text-primary' },
      { label: 'Avg Loss', value: `${avgLoss.toFixed(1)}€`, color: 'text-destructive' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.result && t.pnl != null);
    if (!closed.length) return [];
    const scenarios = [
      { name: 'Best Case', value: Math.max(...closed.map(t=>t.pnl)) },
      { name: 'Expected', value: closed.reduce((a,t)=>a+t.pnl,0)/closed.length },
      { name: 'Worst Case', value: Math.min(...closed.map(t=>t.pnl)) },
      { name: 'Median', value: [...closed].sort((a,b)=>a.pnl-b.pnl)[Math.floor(closed.length/2)]?.pnl || 0 },
    ];
    return scenarios;
  };

  const aiPrompt = "Analyse la valeur attendue (Expected Value) de chaque trade. Évalue si l'EV est positive et durable. Identifie les scénarios optimistes/pessimistes et recommande des ajustements pour maximiser l'EV tout en réduisant la variance.";

  return (
    <QuantPage
      title="Expected Value Calculator"
      subtitle="EV par trade, scénarios probabilistes"
      icon={Calculator}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Scénarios EV', refLine: 0 }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify(trades.filter(t=>t.result&&t.pnl!=null).map(t=>({result:t.result,pnl:t.pnl})).slice(0,100))}
    />
  );
}