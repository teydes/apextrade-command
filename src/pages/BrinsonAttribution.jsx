import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Layers3 } from 'lucide-react';

export default function BrinsonAttribution() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'Brinson', value: 'N/A' }];
    const bySymbol = {};
    for (const t of closed) {
      const s = t.symbol || 'UNKNOWN';
      if (!bySymbol[s]) bySymbol[s] = { pnl: 0, count: 0, wins: 0 };
      bySymbol[s].pnl += t.pnl || 0;
      bySymbol[s].count++;
      if ((t.pnl || 0) > 0) bySymbol[s].wins++;
    }
    const symbols = Object.entries(bySymbol).map(([s, d]) => ({ symbol: s, ...d, avgPnl: d.pnl / d.count, wr: d.wins / d.count }));
    const totalPnl = symbols.reduce((s, d) => s + d.pnl, 0);
    const totalTrades = symbols.reduce((s, d) => s + d.count, 0);
    const allocationEffect = symbols.length > 1 ? (Math.max(...symbols.map(s => s.pnl)) - Math.min(...symbols.map(s => s.pnl))) / totalPnl * 100 : 0;
    const selectionEffect = (() => {
      const best = symbols.reduce((a, b) => a.wr > b.wr ? a : b);
      const worst = symbols.reduce((a, b) => a.wr < b.wr ? a : b);
      return (best.wr - worst.wr) * 100;
    })();
    const interaction = totalPnl / totalTrades;
    return [
      { label: 'Total PnL', value: totalPnl.toFixed(2), color: totalPnl >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Allocation Eff.', value: allocationEffect.toFixed(0) + '%', color: allocationEffect < 50 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Selection Eff.', value: selectionEffect.toFixed(0) + '%', color: selectionEffect < 30 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Symbols', value: symbols.length.toString(), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const bySymbol = {};
    for (const t of closed) {
      const s = t.symbol || 'UNKNOWN';
      bySymbol[s] = (bySymbol[s] || 0) + (t.pnl || 0);
    }
    return Object.entries(bySymbol)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([sym, pnl]) => ({ name: sym, value: pnl }));
  };

  return (
    <QuantPage
      title="Brinson Attribution"
      subtitle="Attribution de performance: allocation vs sélection de symboles"
      icon={Layers3}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'PnL par symbole', refLine: 0 }}
      aiPrompt="Analyse l'attribution de Brinson. L'effet d'allocation mesure combien la répartition entre symboles contribue au PnL. L'effet de sélection mesure la qualité du choix de symboles (win rate par symbole). Une bonne stratégie a un équilibre: l'allocation ne devrait pas dépendre d'un seul symbole, et la sélection devrait être cohérente."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, symbol: t.symbol, strategy: t.strategy })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Allocation Effect</strong>: impact de la répartition entre symboles</p>
        <p><strong className="text-foreground">Selection Effect</strong>: qualité du choix de symboles (WR)</p>
      </div>
    </QuantPage>
  );
}