import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Droplets } from 'lucide-react';

export default function LiquiditySweep() {
  const metrics = (trades) => {
    const tagged = trades.filter(t => t.pattern && t.pattern.toLowerCase().includes('liquidity'));
    const all = trades.filter(t => t.pnl != null);
    if (!all.length) return [];
    const sweepTrades = tagged.filter(t => t.pnl != null);
    const sweepWR = sweepTrades.length ? sweepTrades.filter(t=>t.result==='win').length/sweepTrades.length*100 : 0;
    const overallWR = all.filter(t=>t.result==='win').length/all.length*100;
    const sweepEdge = sweepWR - overallWR;
    const avgSweepPnL = sweepTrades.length ? sweepTrades.reduce((a,t)=>a+t.pnl,0)/sweepTrades.length : 0;
    return [
      { label: 'Sweep Trades', value: sweepTrades.length, color: 'text-blue-400' },
      { label: 'Sweep WR', value: `${sweepWR.toFixed(1)}%`, color: sweepWR > overallWR ? 'text-primary' : 'text-destructive' },
      { label: 'Overall WR', value: `${overallWR.toFixed(1)}%`, color: 'text-muted-foreground' },
      { label: 'Edge', value: `${sweepEdge.toFixed(1)}%`, color: sweepEdge > 0 ? 'text-primary' : 'text-destructive' },
    ];
  };

  const chartData = (trades) => {
    const byDir = { LONG: 0, SHORT: 0 };
    trades.filter(t => t.pattern && t.pattern.toLowerCase().includes('liquidity') && t.direction).forEach(t => {
      byDir[t.direction] = (byDir[t.direction] || 0) + 1;
    });
    return Object.entries(byDir).map(([name, value]) => ({ name, value }));
  };

  const aiPrompt = "Analyse les trades de liquidité sweep (stop hunt). Évalue si ces setups ont un edge statistique par rapport aux autres trades. Identifie les patterns de sweep les plus rentables et recommande des règles d'entrée pour exploiter les stop hunts.";

  return (
    <QuantPage
      title="Liquidity Sweep Detector"
      subtitle="Détection et analyse des stop hunts"
      icon={Droplets}
      metrics={metrics}
      chartData={chartData}
      chartType="pie"
      chartConfig={{ title: 'Direction des Sweeps' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify(trades.filter(t=>t.pattern).map(t=>({pattern:t.pattern,result:t.result,pnl:t.pnl,dir:t.direction})).slice(0,50))}
    />
  );
}