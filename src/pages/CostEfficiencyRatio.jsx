import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { DollarSign } from 'lucide-react';

export default function CostEfficiencyRatio() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 3) return [{ label: 'Cost Efficiency', value: 'N/A' }];
    const grossPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
    const totalCosts = closed.reduce((s, t) => s + (t.commission || 0) + (t.swap || 0), 0);
    const netPnl = grossPnl - totalCosts;
    const costEfficiency = grossPnl > 0 ? (netPnl / grossPnl) * 100 : 0;
    const costPerTrade = totalCosts / closed.length;
    const costPctOfGross = grossPnl > 0 ? (totalCosts / grossPnl) * 100 : 0;
    const tradesNeeded = costPerTrade > 0 && grossPnl > 0 ? Math.ceil(totalCosts / (grossPnl / closed.length)) : 0;
    return [
      { label: 'Cost Efficiency', value: costEfficiency.toFixed(0) + '%', color: costEfficiency > 80 ? 'text-primary' : costEfficiency > 60 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'Net PnL', value: netPnl.toFixed(2), color: netPnl >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Cost/Trade', value: costPerTrade.toFixed(2), color: 'text-foreground' },
      { label: 'Cost % Gross', value: costPctOfGross.toFixed(1) + '%', color: costPctOfGross < 10 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 3) return [];
    const grossPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
    const totalCosts = closed.reduce((s, t) => s + (t.commission || 0) + (t.swap || 0), 0);
    const netPnl = grossPnl - totalCosts;
    return [
      { name: 'Gross PnL', value: grossPnl },
      { name: 'Costs', value: totalCosts },
      { name: 'Net PnL', value: netPnl },
    ];
  };

  return (
    <QuantPage
      title="Cost Efficiency Ratio"
      subtitle="Efficacité après coûts: net vs gross PnL"
      icon={DollarSign}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Gross vs Net PnL', refLine: 0 }}
      aiPrompt="Analyse l'efficacité des coûts. Le ratio net/gross > 80% = excellente gestion des coûts. < 60% = les coûts détruisent trop de profit. Le coût par trade et le % du gross sont les métriques clés. Si les coûts > 10% du gross, envisage: réduire la fréquence, changer de broker, ou augmenter la taille moyenne."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, commission: t.commission, swap: t.swap, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Cost Efficiency</strong> = Net PnL / Gross PnL × 100</p>
        <p>Les coûts de transaction (commissions + swaps) sont un levier souvent négligé.</p>
      </div>
    </QuantPage>
  );
}