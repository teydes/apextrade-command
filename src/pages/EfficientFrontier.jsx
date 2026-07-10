import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Layers } from 'lucide-react';

export default function EfficientFrontier() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const symbols = [...new Set(closed.map(t => t.symbol))];
    if (symbols.length < 2) return [{ label: 'Frontier', value: 'N/A' }];
    const symData = symbols.map(sym => {
      const t = closed.filter(tr => tr.symbol === sym);
      const pnls = t.map(x => x.pnl || 0);
      const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
      const variance = pnls.length > 1 ? pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (pnls.length - 1) : 0;
      return { symbol: sym, mean, std: Math.sqrt(variance), sharpe: Math.sqrt(variance) > 0 ? mean / Math.sqrt(variance) : 0 };
    });
    const best = symData.reduce((a, b) => a.sharpe > b.sharpe ? a : b);
    const avgSharpe = symData.reduce((s, d) => s + d.sharpe, 0) / symData.length;
    return [
      { label: 'Best Symbol', value: best.symbol, color: 'text-primary' },
      { label: 'Best Sharpe', value: best.sharpe.toFixed(3), color: best.sharpe > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Avg Sharpe', value: avgSharpe.toFixed(3), color: 'text-foreground' },
      { label: 'Symbols', value: symbols.length.toString(), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const symbols = [...new Set(closed.map(t => t.symbol))].slice(0, 10);
    return symbols.map(sym => {
      const t = closed.filter(tr => tr.symbol === sym);
      const pnls = t.map(x => x.pnl || 0);
      const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
      const variance = pnls.length > 1 ? pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (pnls.length - 1) : 0;
      return { name: sym, value: mean, risk: Math.sqrt(variance) };
    });
  };

  return (
    <QuantPage
      title="Efficient Frontier"
      subtitle="Optimisation portefeuille: rendement vs risque par symbole"
      icon={Layers}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Rendement moyen par symbole', refLine: 0 }}
      aiPrompt="Analyse l'Efficient Frontier. Chaque symbole est évalué par son ratio rendement/risque (Sharpe). Suggère une allocation optimale: plus de capital aux symboles avec meilleur Sharpe, moins à ceux avec faible ratio. Identifie les symboles à éliminer."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Efficient Frontier</strong>: maximiser le rendement pour un niveau de risque donné</p>
        <p>Les symboles sur la frontière efficiente offrent le meilleur ratio rendement/risque.</p>
      </div>
    </QuantPage>
  );
}