import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Shield } from 'lucide-react';

export default function SharpeSignificance() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 10) return [{ label: 'Sharpe Sig.', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1));
    const sharpe = std > 0 ? mean / std : 0;
    const se = std > 0 ? std / Math.sqrt(n) : 0;
    const tStat = se > 0 ? mean / se : 0;
    const sharpeSE = std > 0 ? Math.sqrt((1 + 0.5 * Math.pow(sharpe, 2)) / n) : 0;
    const sharpeLower = sharpe - 1.96 * sharpeSE;
    const sharpeUpper = sharpe + 1.96 * sharpeSE;
    const isSignificant = sharpeLower > 0;
    const minTrades = std > 0 ? Math.ceil(Math.pow(1.96 * std / Math.abs(mean), 2)) : 0;
    return [
      { label: 'Sharpe', value: sharpe.toFixed(3), color: sharpe > 0.5 ? 'text-primary' : 'text-red-400' },
      { label: 'CI 95% Lower', value: sharpeLower.toFixed(3), color: sharpeLower > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Significatif', value: isSignificant ? 'Oui' : 'Non', color: isSignificant ? 'text-primary' : 'text-red-400' },
      { label: 'Min Trades', value: minTrades.toString(), color: n > minTrades ? 'text-primary' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 15) return [];
    const window = 15;
    const result = [];
    for (let i = window; i <= pnls.length; i++) {
      const slice = pnls.slice(i - window, i);
      const m = slice.reduce((a, b) => a + b, 0) / slice.length;
      const v = slice.reduce((s, p) => s + Math.pow(p - m, 2), 0) / (slice.length - 1);
      const s = Math.sqrt(v);
      const sh = s > 0 ? m / s : 0;
      const se = s > 0 ? Math.sqrt((1 + 0.5 * Math.pow(sh, 2)) / slice.length) : 0;
      result.push({ name: `T${i}`, sharpe: sh, lower: sh - 1.96 * se });
    }
    return result;
  };

  return (
    <QuantPage
      title="Sharpe Ratio Significance"
      subtitle="Significativité statistique du Sharpe ratio (intervalle de confiance)"
      icon={Shield}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Sharpe et CI 95% inférieur' }}
      dataKey="sharpe"
      aiPrompt="Analyse la significativité du Sharpe. Le Sharpe n'est qu'une estimation: son IC 95% doit ne pas contenir 0 pour être significatif. Si le Sharpe est 1.5 mais l'IC inférieur est -0.2, il n'est pas significatif. Le 'Min Trades' indique combien de trades sont nécessaires pour valider le Sharpe actuel."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">SE(Sharpe)</strong> = √((1 + 0.5×Sharpe²) / n) — erreur standard du Sharpe</p>
        <p>Le Sharpe n'est fiable que si son IC 95% inférieur est supérieur à 0.</p>
      </div>
    </QuantPage>
  );
}