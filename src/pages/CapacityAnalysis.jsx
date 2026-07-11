import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { TrendingUp } from 'lucide-react';

export default function CapacityAnalysis() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'Capacity', value: 'N/A' }];
    const pnls = closed.map(t => t.pnl);
    const n = pnls.length;
    const avgPnl = pnls.reduce((a, b) => a + b, 0) / n;
    const avgLot = closed.reduce((s, t) => s + (t.lot_size || t.quantity || 1), 0) / n;
    const pnlPerLot = avgLot > 0 ? avgPnl / avgLot : avgPnl;
    const maxPnl = Math.max(...pnls);
    const minPnl = Math.min(...pnls);
    const range = maxPnl - minPnl;
    const capacityMultiplier = range > 0 ? Math.abs(avgPnl) / range : 1;
    const estCapacity = Math.round(avgLot * capacityMultiplier * 10);
    const scalability = Math.min(capacityMultiplier * 100, 100);
    return [
      { label: 'Avg PnL/Trade', value: avgPnl.toFixed(2), color: avgPnl >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Avg Lot Size', value: avgLot.toFixed(2), color: 'text-foreground' },
      { label: 'PnL/Lot', value: pnlPerLot.toFixed(2), color: pnlPerLot >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Scalability', value: scalability.toFixed(0) + '%', color: scalability > 50 ? 'text-primary' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    return closed.slice(-30).map((t, i) => ({
      name: `T${i + 1}`,
      value: (t.pnl || 0) / Math.max(t.lot_size || t.quantity || 1, 0.01),
    }));
  };

  return (
    <QuantPage
      title="Strategy Capacity Analysis"
      subtitle="Capacité de la stratégie: peut-elle absorber plus de capital?"
      icon={TrendingUp}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'PnL par lot (efficacité)', refLine: 0 }}
      aiPrompt="Analyse la capacité de la stratégie. Le PnL par lot indique l'efficacité unitaire. Une stratégie avec une bonne scalability peut absorber plus de capital sans dégrader la performance. Si le PnL/lot diminue avec la taille, la stratégie a une capacité limitée (impact du marché). Identifie la taille optimale."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-30).map(t => ({ pnl: t.pnl, lot_size: t.lot_size, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Capacity</strong>: capital maximum avant dégradation de la performance</p>
        <p>Le PnL/lot est l'indicateur clé: s'il baisse avec la taille, la stratégie est limitée en capacité.</p>
      </div>
    </QuantPage>
  );
}