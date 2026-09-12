import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Receipt } from 'lucide-react';

export default function CostAdjustedSharpe() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'Cost Sharpe', value: 'N/A' }];
    const grossPnls = closed.map(t => t.pnl || 0);
    const netPnls = closed.map(t => (t.pnl || 0) - (t.commission || 0) - (t.swap || 0));
    const stat = (arr) => {
      const n = arr.length;
      const mean = arr.reduce((a, b) => a + b, 0) / n;
      const std = Math.sqrt(arr.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1));
      return { mean, std, sharpe: std > 0 ? mean / std : 0 };
    };
    const g = stat(grossPnls);
    const net = stat(netPnls);
    const totalCosts = closed.reduce((s, t) => s + (t.commission || 0) + (t.swap || 0), 0);
    const costDrag = g.mean !== 0 ? ((g.mean - net.mean) / Math.abs(g.mean)) * 100 : 0;
    const costRatio = Math.abs(g.sharpe) > 0 ? (net.sharpe / g.sharpe) * 100 : 0;
    return [
      { label: 'Net Sharpe', value: net.sharpe.toFixed(3), color: net.sharpe > 0.3 ? 'text-primary' : 'text-red-400' },
      { label: 'Gross Sharpe', value: g.sharpe.toFixed(3), color: 'text-yellow-400' },
      { label: 'Coût total', value: totalCosts.toFixed(2), color: 'text-red-400' },
      { label: 'Cost Drag', value: costDrag.toFixed(0) + '%', color: costDrag < 20 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 8) return [];
    const window = 10;
    const result = [];
    for (let i = window; i <= closed.length; i++) {
      const slice = closed.slice(i - window, i);
      const net = slice.map(t => (t.pnl || 0) - (t.commission || 0) - (t.swap || 0));
      const m = net.reduce((a, b) => a + b, 0) / net.length;
      const v = net.reduce((s, p) => s + Math.pow(p - m, 2), 0) / (net.length - 1);
      const s = Math.sqrt(v);
      result.push({ name: `T${i}`, value: s > 0 ? m / s : 0 });
    }
    return result;
  };

  return (
    <QuantPage
      title="Cost-Adjusted Sharpe"
      subtitle="Sharpe net de commissions et swaps — le vrai ratio après frictions"
      icon={Receipt}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Net Sharpe glissant', refLine: 0 }}
      aiPrompt="Analyse le Sharpe ajusté des coûts. Le Sharpe brut ignore les frictions (commissions, swaps) qui peuvent détruire 20 à 50% de l'edge d'une stratégie scalping. Le cost drag (écart gross/net) doit rester sous 20%. Si le Net Sharpe devient négatif alors que le Gross Sharpe est positif, la stratégie paie pour le marché: réduisez la fréquence ou négociez les spreads."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, commission: t.commission, swap: t.swap, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Net Sharpe</strong> = mean(PnL − commissions − swaps) / σ_net</p>
        <p>Le cost drag est l'ennemi silencieux du scalping: mesurez-le avant de scaler.</p>
      </div>
    </QuantPage>
  );
}