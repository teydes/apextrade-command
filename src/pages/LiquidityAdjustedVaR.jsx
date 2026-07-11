import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Shield } from 'lucide-react';

export default function LiquidityAdjustedVaR() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl).sort((a, b) => a - b);
    if (pnls.length < 10) return [{ label: 'L-VaR', value: 'N/A' }];
    const n = pnls.length;
    const var95 = pnls[Math.floor(n * 0.05)];
    const avgLot = closed.reduce((s, t) => s + (t.lot_size || t.quantity || 1), 0) / n;
    const liquidityDiscount = Math.min(avgLot * 0.01, 0.05);
    const liquidityAdjVar = var95 * (1 + liquidityDiscount);
    const liquidityCost = Math.abs(liquidityAdjVar - var95);
    const spreadImpact = Math.abs(var95) * liquidityDiscount;
    return [
      { label: 'L-VaR 95%', value: liquidityAdjVar.toFixed(2), color: 'text-red-400' },
      { label: 'VaR 95%', value: var95.toFixed(2), color: 'text-yellow-400' },
      { label: 'Liquidity Cost', value: liquidityCost.toFixed(2), color: 'text-yellow-400' },
      { label: 'Spread Impact', value: spreadImpact.toFixed(2), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl).sort((a, b) => a - b);
    if (pnls.length < 10) return [];
    const n = pnls.length;
    const var95 = pnls[Math.floor(n * 0.05)];
    const var99 = pnls[Math.floor(n * 0.01)];
    const avgLot = closed.reduce((s, t) => s + (t.lot_size || t.quantity || 1), 0) / n;
    const lDisc = Math.min(avgLot * 0.01, 0.05);
    return [
      { name: 'VaR 95%', value: var95 },
      { name: 'L-VaR 95%', value: var95 * (1 + lDisc) },
      { name: 'VaR 99%', value: var99 },
      { name: 'L-VaR 99%', value: var99 * (1 + lDisc) },
    ];
  };

  return (
    <QuantPage
      title="Liquidity-Adjusted VaR"
      subtitle="VaR ajusté pour le risque de liquidité (coût de sortie)"
      icon={Shield}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'VaR vs L-VaR', refLine: 0 }}
      aiPrompt="Analyse le L-VaR. Le VaR standard ne tient pas compte de la liquidité: en réalité, sortir d'une position large coûte du slippage et du spread. Le L-VaR ajuste le VaR en ajoutant un coût de liquidité proportionnel à la taille. Si l'écart L-VaR/VaR > 10%, la stratégie est sensible à la liquidité."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, lot_size: t.lot_size, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">L-VaR</strong> = VaR × (1 + liquidité × taille)</p>
        <p>Le L-VaR capture le coût réel de sortie de position, ignoré par le VaR standard.</p>
      </div>
    </QuantPage>
  );
}