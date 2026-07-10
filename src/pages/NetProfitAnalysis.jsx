import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { DollarSign } from 'lucide-react';

export default function NetProfitAnalysis() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 3) return [{ label: 'Net Profit', value: 'N/A' }];
    const grossProfit = closed.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(closed.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    const commissions = closed.reduce((s, t) => s + (t.commission || 0), 0);
    const swaps = closed.reduce((s, t) => s + (t.swap || 0), 0);
    const grossPnl = grossProfit - grossLoss;
    const netPnl = grossPnl - commissions - swaps;
    const costImpact = grossPnl > 0 ? ((commissions + swaps) / grossPnl) * 100 : 0;
    return [
      { label: 'Net Profit', value: netPnl.toFixed(2), color: netPnl >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Gross Profit', value: grossPnl.toFixed(2), color: grossPnl >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Total Costs', value: (commissions + swaps).toFixed(2), color: 'text-red-400' },
      { label: 'Cost Impact %', value: costImpact.toFixed(1) + '%', color: costImpact < 10 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 3) return [];
    const grossProfit = closed.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(closed.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    const commissions = closed.reduce((s, t) => s + (t.commission || 0), 0);
    const swaps = closed.reduce((s, t) => s + (t.swap || 0), 0);
    return [
      { name: 'Gross Profit', value: grossProfit },
      { name: 'Gross Loss', value: grossLoss },
      { name: 'Commissions', value: commissions },
      { name: 'Swaps', value: swaps },
      { name: 'Net', value: grossProfit - grossLoss - commissions - swaps },
    ];
  };

  return (
    <QuantPage
      title="Net Profit Analysis"
      subtitle="PnL net après commissions et swaps (coût réel du trading)"
      icon={DollarSign}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Décomposition du PnL', refLine: 0 }}
      aiPrompt="Analyse le Net Profit. L'impact des coûts (commissions + swaps) sur le PnL brut est crucial. Si le coût dépasse 10% du gross profit, le trader trade trop ou avec un broker trop cher. Suggère des optimisations: réduire la fréquence, négocier les spreads, choisir un broker avec moins de frais."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, commission: t.commission, swap: t.swap, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Net Profit</strong> = Gross PnL − Commissions − Swaps</p>
        <p>L'impact des coûts est souvent sous-estimé mais peut détruire la rentabilité d'une stratégie.</p>
      </div>
    </QuantPage>
  );
}