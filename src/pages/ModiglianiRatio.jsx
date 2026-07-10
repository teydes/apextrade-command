import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Scale } from 'lucide-react';

export default function ModiglianiRatio() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'M²', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const variance = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1);
    const std = Math.sqrt(variance);
    const sharpe = std > 0 ? mean / std : 0;
    const benchmarkStd = std * 0.8; // proxy benchmark volatility
    const m2 = sharpe * benchmarkStd;
    const m2Annual = m2 * Math.sqrt(252);
    return [
      { label: 'M² (Modigliani)', value: m2.toFixed(3), color: m2 > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'M² Annualized', value: m2Annual.toFixed(3), color: m2Annual > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Sharpe', value: sharpe.toFixed(3), color: sharpe > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Rendement ajusté', value: (m2 * 100).toFixed(1), color: m2 > 0 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0;
    return closed.slice(-50).map((t, i) => {
      cumul += t.pnl || 0;
      return { name: `T${i + 1}`, value: cumul };
    });
  };

  return (
    <QuantPage
      title="Modigliani Ratio (M²)"
      subtitle="Sharpe exprimé en termes de rendement (risque égalisé au benchmark)"
      icon={Scale}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity Curve' }}
      aiPrompt="Analyse le ratio de Modigliani (M²). Le M² convertit le Sharpe en unités de rendement, ce qui le rend plus intuitif. Un M² > 0 = la stratégie bat le benchmark ajusté au risque. Compare directement avec le rendement du benchmark."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">M²</strong> = Sharpe × σ(benchmark)</p>
        <p>Le M² exprime le Sharpe en termes de rendement absolu, facilitant la comparaison.</p>
      </div>
    </QuantPage>
  );
}