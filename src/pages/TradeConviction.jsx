import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Star } from 'lucide-react';

export default function TradeConviction() {
  const metrics = (trades) => {
    const tagged = trades.filter(t => t.setup || t.pattern || t.mistakes);
    if (!tagged.length) return [];
    const withSetup = trades.filter(t => t.setup);
    const wins = withSetup.filter(t => t.result === 'win');
    const losses = withSetup.filter(t => t.result === 'loss');
    const convictionWinRate = withSetup.length ? (wins.length / withSetup.length * 100) : 0;
    const avgWin = wins.length ? wins.reduce((a,t)=>a+(t.pnl||0),0)/wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((a,t)=>a+(t.pnl||0),0)/losses.length : 0;
    const convScore = avgWin && avgLoss ? (avgWin / Math.abs(avgLoss)) : 0;
    return [
      { label: 'Tagged Trades', value: withSetup.length, color: 'text-blue-400' },
      { label: 'Conviction WR', value: `${convictionWinRate.toFixed(1)}%`, color: convictionWinRate > 50 ? 'text-primary' : 'text-destructive' },
      { label: 'Avg Win', value: `${avgWin.toFixed(1)}€`, color: 'text-primary' },
      { label: 'Win/Loss Ratio', value: convScore.toFixed(2), color: convScore > 1 ? 'text-primary' : 'text-destructive' },
    ];
  };

  const chartData = (trades) => {
    const bySetup = {};
    trades.filter(t => t.setup && t.pnl != null).forEach(t => {
      if (!bySetup[t.setup]) bySetup[t.setup] = { wins: 0, losses: 0, pnl: 0 };
      if (t.result === 'win') bySetup[t.setup].wins++;
      else if (t.result === 'loss') bySetup[t.setup].losses++;
      bySetup[t.setup].pnl += t.pnl;
    });
    return Object.entries(bySetup).map(([name, d]) => ({ name, value: d.pnl }));
  };

  const aiPrompt = "Analyse la corrélation entre la conviction du trader (setup/pattern utilisé) et le résultat réel. Identifie les setups où le trader est confiant mais qui performe mal. Recommande des ajustements de conviction et de sélection de trades.";

  return (
    <QuantPage
      title="Trade Conviction"
      subtitle="Score de conviction vs résultat réel"
      icon={Star}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'PnL par Setup (Conviction)' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify(trades.filter(t=>t.setup).map(t=>({setup:t.setup,result:t.result,pnl:t.pnl,symbol:t.symbol})).slice(0,50))}
    />
  );
}