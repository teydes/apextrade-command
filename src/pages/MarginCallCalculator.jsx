import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { ShieldAlert } from 'lucide-react';

export default function MarginCallCalculator() {
  const metrics = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    const equity = 10000 + pnls.reduce((a,b)=>a+b,0);
    const openRisk = trades.filter(t => t.status === 'open').reduce((a,t)=>a+Math.abs(t.stop_loss?(t.entry_price-t.stop_loss)*(t.quantity||1):0), 0);
    const marginReq = equity * 0.3;
    const marginLevel = marginReq ? (equity / marginReq * 100) : 0;
    const marginCallPrice = equity * 0.5;
    const blowoutPrice = equity * 0.3;
    return [
      { label: 'Equity', value: `${equity.toFixed(0)}€`, color: 'text-primary' },
      { label: 'Margin Level', value: `${marginLevel.toFixed(0)}%`, color: marginLevel > 200 ? 'text-primary' : marginLevel > 100 ? 'text-yellow-400' : 'text-destructive' },
      { label: 'Margin Call', value: `${marginCallPrice.toFixed(0)}€`, color: 'text-destructive' },
      { label: 'Blowout', value: `${blowoutPrice.toFixed(0)}€`, color: 'text-destructive' },
    ];
  };

  const chartData = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    let equity = 10000;
    return pnls.map((p, i) => { equity += p; return { name: `T${i+1}`, value: equity }; });
  };

  const aiPrompt = "Analyse le risque de margin call et de blown account. Évalue le niveau de marge actuel et la distance au margin call. Recommande des stratégies de gestion du capital pour éviter le margin call et optimiser l'utilisation du levier.";

  return (
    <QuantPage
      title="Margin Call Calculator"
      subtitle="Niveau de marge, risque de liquidation"
      icon={ShieldAlert}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity vs Margin Call Level' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify({ equity: 10000 + trades.filter(t=>t.pnl!=null).reduce((a,t)=>a+t.pnl,0), openTrades: trades.filter(t=>t.status==='open').length })}
    />
  );
}