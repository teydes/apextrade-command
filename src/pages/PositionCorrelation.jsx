import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Target } from 'lucide-react';

export default function PositionCorrelation() {
  const metrics = (trades) => {
    const open = trades.filter(t => t.status === 'open' || t.result == null);
    if (!open.length) return [];
    const bySymbol = {};
    open.forEach(t => {
      if (!bySymbol[t.symbol]) bySymbol[t.symbol] = { long: 0, short: 0 };
      if (t.direction === 'LONG') bySymbol[t.symbol].long++;
      else if (t.direction === 'SHORT') bySymbol[t.symbol].short++;
    });
    const symbols = Object.keys(bySymbol);
    const correlated = symbols.filter(s => bySymbol[s].long > 0 && bySymbol[s].short > 0).length;
    const sameDirection = symbols.filter(s => bySymbol[s].long === 0 || bySymbol[s].short === 0).length;
    const netLong = open.filter(t => t.direction === 'LONG').length;
    const netShort = open.filter(t => t.direction === 'SHORT').length;
    return [
      { label: 'Open Positions', value: open.length, color: 'text-blue-400' },
      { label: 'Net Long', value: netLong, color: 'text-primary' },
      { label: 'Net Short', value: netShort, color: 'text-destructive' },
      { label: 'Hedged Symbols', value: correlated, color: correlated > 0 ? 'text-yellow-400' : 'text-muted-foreground' },
    ];
  };

  const chartData = (trades) => {
    const bySymbol = {};
    trades.forEach(t => {
      if (!t.symbol) return;
      if (!bySymbol[t.symbol]) bySymbol[t.symbol] = { long: 0, short: 0 };
      if (t.direction === 'LONG') bySymbol[t.symbol].long++;
      else if (t.direction === 'SHORT') bySymbol[t.symbol].short++;
    });
    return Object.entries(bySymbol).slice(0, 10).map(([name, d]) => ({ name, value: d.long + d.short }));
  };

  const aiPrompt = "Analyse la corrélation entre les positions ouvertes. Identifie les positions qui se hedgent mutuellement et celles qui amplifient le risque directionnel. Recommande des ajustements pour optimiser la diversification et réduire la corrélation nocive.";

  return (
    <QuantPage
      title="Position Correlation"
      subtitle="Corrélation entre positions, hedging naturel"
      icon={Target}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Positions par Symbole' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify(trades.filter(t=>t.direction).map(t=>({symbol:t.symbol,dir:t.direction,asset:t.asset_class})).slice(0,30))}
    />
  );
}