import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Gauge } from 'lucide-react';

export default function VolatilityAdjustedReturns() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'Vol-Adj Return', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1));
    const volAdjReturn = std > 0 ? mean / std : 0;
    const totalReturn = pnls.reduce((a, b) => a + b, 0);
    const volAdjTotal = std > 0 ? totalReturn / (std * Math.sqrt(n)) : 0;
    const efficiency = Math.abs(mean) > 0 ? (Math.abs(mean) / std) * Math.sqrt(n) : 0;
    return [
      { label: 'Vol-Adj Return', value: volAdjReturn.toFixed(3), color: volAdjReturn > 0.5 ? 'text-primary' : 'text-red-400' },
      { label: 'Return per σ', value: (mean / Math.max(std, 0.01)).toFixed(3), color: 'text-foreground' },
      { label: 'Efficiency', value: efficiency.toFixed(3), color: efficiency > 1 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Total Return', value: totalReturn.toFixed(2), color: totalReturn >= 0 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 10) return [];
    const window = 10;
    const result = [];
    for (let i = window; i <= pnls.length; i++) {
      const slice = pnls.slice(i - window, i);
      const m = slice.reduce((a, b) => a + b, 0) / slice.length;
      const v = slice.reduce((s, p) => s + Math.pow(p - m, 2), 0) / (slice.length - 1);
      const s = Math.sqrt(v);
      result.push({ name: `T${i}`, value: s > 0 ? m / s : 0 });
    }
    return result;
  };

  return (
    <QuantPage
      title="Volatility-Adjusted Returns"
      subtitle="Rendements ajustés par la volatilité (rendement par unité de risque)"
      icon={Gauge}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Rendement ajusté volatilité (rolling)', refLine: 0 }}
      aiPrompt="Analyse le rendement ajusté par la volatilité. C'est essentiellement le Sharpe ratio sans annualisation. > 0.5 = bon. Le rendement par unité de σ montre combien de rendement on obtient pour chaque unité de risque prise. L'efficiency > 1 = la stratégie génère plus de rendement que de risque."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Vol-Adj Return</strong> = Mean / Std — Sharpe non annualisé</p>
        <p>Le rendement ajusté par la volatilité normalise la performance par le risque pris.</p>
      </div>
    </QuantPage>
  );
}