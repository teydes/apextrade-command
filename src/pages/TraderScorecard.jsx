import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Award } from 'lucide-react';

export default function TraderScorecard() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.pnl != null && t.result);
    if (!closed.length) return [];
    const wins = closed.filter(t => t.result === 'win');
    const losses = closed.filter(t => t.result === 'loss');
    const totalPnL = closed.reduce((a,t)=>a+t.pnl,0);
    const winRate = wins.length / closed.length * 100;
    const profitFactor = losses.length ? Math.abs(wins.reduce((a,t)=>a+t.pnl,0) / losses.reduce((a,t)=>a+t.pnl,0)) : 0;
    const avgWin = wins.length ? wins.reduce((a,t)=>a+t.pnl,0)/wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((a,t)=>a+t.pnl,0)/losses.length : 0;
    const rr = avgLoss ? Math.abs(avgWin/avgLoss) : 0;
    const expectancy = (winRate/100) * avgWin - (1-winRate/100) * Math.abs(avgLoss);
    const score = Math.min(100, (profitFactor * 15) + (winRate * 0.5) + (rr * 10) + (expectancy > 0 ? 20 : 0));
    return [
      { label: 'Trader Score', value: `${score.toFixed(0)}/100`, color: score > 70 ? 'text-primary' : score > 40 ? 'text-yellow-400' : 'text-destructive' },
      { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, color: winRate > 50 ? 'text-primary' : 'text-destructive' },
      { label: 'Profit Factor', value: profitFactor.toFixed(2), color: profitFactor > 1.5 ? 'text-primary' : 'text-destructive' },
      { label: 'Expectancy', value: `${expectancy.toFixed(1)}€`, color: expectancy > 0 ? 'text-primary' : 'text-destructive' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.pnl != null && t.result);
    if (!closed.length) return [];
    const wins = closed.filter(t => t.result === 'win');
    const losses = closed.filter(t => t.result === 'loss');
    const avgWin = wins.length ? wins.reduce((a,t)=>a+t.pnl,0)/wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((a,t)=>a+t.pnl,0)/losses.length : 0;
    const winRate = wins.length / closed.length * 100;
    const profitFactor = losses.length ? Math.abs(wins.reduce((a,t)=>a+t.pnl,0) / losses.reduce((a,t)=>a+t.pnl,0)) : 0;
    const rr = avgLoss ? Math.abs(avgWin/avgLoss) : 0;
    return [
      { name: 'Win Rate', value: winRate },
      { name: 'R:R Ratio', value: rr * 50 },
      { name: 'PF x10', value: profitFactor * 10 },
      { name: 'Discipline', value: 70 },
      { name: 'Consistency', value: 60 },
    ];
  };

  const aiPrompt = "Génère un scorecard global du trader. Évalue les forces et faiblesses across tous les axes: win rate, profit factor, R:R, discipline, consistance. Donne une note globale sur 100 et recommande 3 axes d'amélioration prioritaires.";

  return (
    <QuantPage
      title="Trader Scorecard"
      subtitle="Score global, forces & faiblesses"
      icon={Award}
      metrics={metrics}
      chartData={chartData}
      chartType="radar"
      chartConfig={{ title: 'Scorecard Radar' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify({ totalTrades: trades.length, results: trades.filter(t=>t.result).map(t=>({result:t.result,pnl:t.pnl})) })}
    />
  );
}