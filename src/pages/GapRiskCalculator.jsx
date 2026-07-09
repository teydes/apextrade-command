import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Moon } from 'lucide-react';

export default function GapRiskCalculator() {
  const metrics = (trades) => {
    const overnight = trades.filter(t => t.entry_time && t.exit_time);
    if (!overnight.length) return [];
    const gapTrades = overnight.filter(t => {
      try {
        const entry = new Date(t.entry_time), exit = new Date(t.exit_time);
        return entry.getDate() !== exit.getDate() || exit.getHours() < 6;
      } catch { return false; }
    });
    const gapPnls = gapTrades.map(t => t.pnl).filter(p => p != null);
    const gapLosses = gapPnls.filter(p => p < 0);
    const totalGapRisk = gapLosses.reduce((a,b)=>a+Math.abs(b), 0);
    const gapPct = (gapTrades.length / overnight.length * 100);
    return [
      { label: 'Trades Overnight', value: gapTrades.length, color: 'text-blue-400' },
      { label: '% du Total', value: `${gapPct.toFixed(1)}%`, color: 'text-yellow-400' },
      { label: 'Gap Loss Total', value: `${totalGapRisk.toFixed(0)}€`, color: 'text-destructive' },
      { label: 'Avg Gap PnL', value: gapPnls.length ? `${(gapPnls.reduce((a,b)=>a+b,0)/gapPnls.length).toFixed(1)}€` : '0€', color: 'text-muted-foreground' },
    ];
  };

  const chartData = (trades) => {
    const byDay = {};
    trades.filter(t => t.entry_time && t.pnl != null).forEach(t => {
      try {
        const day = new Date(t.entry_time).toLocaleDateString('en', { weekday: 'short' });
        byDay[day] = (byDay[day] || 0) + t.pnl;
      } catch {}
    });
    return Object.entries(byDay).map(([name, value]) => ({ name, value }));
  };

  const aiPrompt = "Analyse le risque de gap (overnight/weekend). Évalue l'exposition aux gaps de marché, identifie les sessions à risque élevé. Recommande des stratégies de hedging overnight et de réduction de l'exposition au gap risk.";

  return (
    <QuantPage
      title="Gap Risk Calculator"
      subtitle="Risque de gap overnight, exposition weekend"
      icon={Moon}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'PnL par Jour de Semaine' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify({ trades: trades.filter(t=>t.entry_time).map(t=>({entry_time:t.entry_time, pnl:t.pnl, symbol:t.symbol})).slice(0,50) })}
    />
  );
}