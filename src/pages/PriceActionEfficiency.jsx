import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function PriceActionEfficiency() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && t.entry_price && t.exit_price);
    if (closed.length < 3) return [{ label: 'Efficiency', value: 'N/A' }];
    let totalMove = 0, totalCaptured = 0;
    for (const t of closed) {
      const direction = t.direction === 'LONG' ? 1 : -1;
      const priceMove = (t.exit_price - t.entry_price) * direction;
      const captured = t.pnl || 0;
      totalMove += Math.abs(priceMove);
      totalCaptured += captured;
    }
    const efficiency = totalMove > 0 ? (totalCaptured / totalMove) * 100 : 0;
    const avgMove = totalMove / closed.length;
    const avgCaptured = totalCaptured / closed.length;
    return [
      { label: 'Capture %', value: efficiency.toFixed(1) + '%', color: efficiency > 50 ? 'text-primary' : efficiency > 20 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'Avg Captured', value: avgCaptured.toFixed(2), color: avgCaptured >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Avg Move', value: avgMove.toFixed(4), color: 'text-foreground' },
      { label: 'Trades', value: closed.length.toString(), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && t.entry_price && t.exit_price);
    return closed.slice(-30).map((t, i) => {
      const direction = t.direction === 'LONG' ? 1 : -1;
      const move = Math.abs((t.exit_price - t.entry_price) * direction);
      return { name: `T${i + 1}`, captured: t.pnl || 0, move };
    });
  };

  return (
    <QuantPage
      title="Price Action Efficiency"
      subtitle="Capacité à capturer le mouvement de prix (PnL vs amplitude du mouvement)"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Captured vs Price Move' }}
      dataKey="captured"
      aiPrompt="Analyse l'efficacité de capture. Le % de capture mesure la part du mouvement de prix capturé par le trader. > 50% = excellent timing. < 20% = le trader entre trop tard ou sort trop tôt. Évalue la qualité du timing d'entrée et de sortie."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed' && t.entry_price).slice(-30).map(t => ({ pnl: t.pnl, entry: t.entry_price, exit: t.exit_price, direction: t.direction, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Capture %</strong> = Σ PnL / Σ |mouvement de prix| × 100</p>
        <p>Mesure la capacité à capturer le mouvement directionnel du marché.</p>
      </div>
    </QuantPage>
  );
}