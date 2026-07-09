import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { GitMerge } from 'lucide-react';

export default function HedgingCalculator() {
  const metrics = (trades) => {
    const open = trades.filter(t => t.status === 'open' || t.result == null);
    const longs = open.filter(t => t.direction === 'LONG');
    const shorts = open.filter(t => t.direction === 'SHORT');
    const longExp = longs.reduce((a,t)=>a+(t.entry_price||0)*(t.quantity||0), 0);
    const shortExp = shorts.reduce((a,t)=>a+(t.entry_price||0)*(t.quantity||0), 0);
    const netExp = longExp - shortExp;
    const hedgeRatio = longExp ? (shortExp/longExp*100) : 0;
    return [
      { label: 'Exposition Long', value: `${longExp.toFixed(0)}€`, color: 'text-primary' },
      { label: 'Exposition Short', value: `${shortExp.toFixed(0)}€`, color: 'text-blue-400' },
      { label: 'Exposition Nette', value: `${netExp.toFixed(0)}€`, color: Math.abs(netExp) < longExp*0.2 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Hedge Ratio', value: `${hedgeRatio.toFixed(1)}%`, color: hedgeRatio > 50 ? 'text-primary' : 'text-destructive' },
    ];
  };

  const chartData = (trades) => {
    const byAsset = {};
    trades.filter(t => t.asset_class).forEach(t => {
      const exp = (t.entry_price||0)*(t.quantity||0)*(t.direction==='LONG'?1:-1);
      byAsset[t.asset_class] = (byAsset[t.asset_class]||0) + exp;
    });
    return Object.entries(byAsset).map(([name, value]) => ({ name, value: Math.abs(value) }));
  };

  const aiPrompt = "Analyse l'exposition nette et le ratio de couverture. Évalue si le portefeuille est correctement hedgé. Identifie les corrélations entre positions et recommande des ajustements pour optimiser la couverture (delta-neutral, beta-neutral).";

  return (
    <QuantPage
      title="Hedging Calculator"
      subtitle="Exposition nette, hedge ratio, delta-neutral"
      icon={GitMerge}
      metrics={metrics}
      chartData={chartData}
      chartType="pie"
      chartConfig={{ title: 'Exposition par Asset Class' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify(trades.filter(t=>t.direction).map(t=>({dir:t.direction,symbol:t.symbol,asset:t.asset_class,qty:t.quantity,price:t.entry_price})).slice(0,30))}
    />
  );
}