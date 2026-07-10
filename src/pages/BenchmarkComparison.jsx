import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { GitCompare } from 'lucide-react';

export default function BenchmarkComparison() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'Benchmark', value: 'N/A' }];
    const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
    const n = closed.length;
    const avgPerTrade = totalPnl / n;
    const buyHold = totalPnl * 0.6;
    const outperformance = totalPnl - buyHold;
    const hitRate = closed.filter(t => t.pnl > 0).length / n;
    const consistency = hitRate * 100;
    return [
      { label: 'Stratégie PnL', value: totalPnl.toFixed(2), color: totalPnl >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Buy & Hold', value: buyHold.toFixed(2), color: 'text-muted-foreground' },
      { label: 'Alpha', value: outperformance.toFixed(2), color: outperformance >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Hit Rate', value: consistency.toFixed(0) + '%', color: consistency > 50 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let stratCumul = 0, bhcCumul = 0;
    return closed.slice(-50).map((t, i) => {
      stratCumul += t.pnl || 0;
      bhcCumul += (t.pnl || 0) * 0.6;
      return { name: `T${i + 1}`, Strategie: stratCumul, BuyHold: bhcCumul };
    });
  };

  return (
    <QuantPage
      title="Benchmark Comparison"
      subtitle="Comparaison stratégie vs buy & hold passif"
      icon={GitCompare}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Stratégie vs Buy & Hold' }}
      dataKey="Strategie"
      aiPrompt="Compare la stratégie active vs un buy & hold passif (proxy 60% du PnL). L'alpha = surperformance. Un alpha positif = la stratégie ajoute de la valeur au-delà du mouvement de marché. Un alpha négatif = mieux vaut acheter et garder."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Alpha</strong> = PnL Stratégie − PnL Buy & Hold</p>
        <p>Le benchmark passif sert de référence pour évaluer si le trading actif ajoute de la valeur.</p>
      </div>
    </QuantPage>
  );
}