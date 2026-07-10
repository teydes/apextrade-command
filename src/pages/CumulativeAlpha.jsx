import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function CumulativeAlpha() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'Cum. Alpha', value: 'N/A' }];
    const pnls = closed.map(t => t.pnl);
    const totalAlpha = pnls.reduce((a, b) => a + b, 0);
    const n = pnls.length;
    const mean = totalAlpha / n;
    const wins = pnls.filter(p => p > 0).length;
    const losses = pnls.filter(p => p < 0).length;
    const rollingAlpha = [];
    let cumul = 0;
    for (let i = 0; i < pnls.length; i += 10) {
      const slice = pnls.slice(i, i + 10);
      const batchAlpha = slice.reduce((a, b) => a + b, 0);
      cumul += batchAlpha;
      rollingAlpha.push(cumul);
    }
    const acceleration = rollingAlpha.length > 1 ? rollingAlpha[rollingAlpha.length - 1] - rollingAlpha[rollingAlpha.length - 2] : 0;
    return [
      { label: 'Cumulative α', value: totalAlpha.toFixed(2), color: totalAlpha > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Avg α/Trade', value: mean.toFixed(2), color: mean > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'W/L Ratio', value: (wins / Math.max(losses, 1)).toFixed(2), color: wins > losses ? 'text-primary' : 'text-red-400' },
      { label: 'Acceleration', value: acceleration.toFixed(2), color: acceleration > 0 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0;
    return closed.slice(-60).map((t, i) => {
      cumul += t.pnl || 0;
      return { name: `T${i + 1}`, value: cumul };
    });
  };

  return (
    <QuantPage
      title="Cumulative Alpha Generation"
      subtitle="Alpha cumulé dans le temps (valeur ajoutée de la stratégie)"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="area"
      chartConfig={{ title: 'Alpha cumulé', refLine: 0 }}
      aiPrompt="Analyse la génération d'alpha cumulée. La pente de la courbe indique la vitesse de génération d'alpha. Une courbe qui accélère = amélioration. Une courbe qui ralentit ou s'aplatit = détérioration. L'accélération positive = la stratégie s'améliore dans le temps."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, symbol: t.symbol, strategy: t.strategy })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Cumulative Alpha</strong> = Σ (PnL trade) — valeur ajoutée totale</p>
        <p>L'accélération de l'alpha indique si la stratégie s'améliore ou se détériore.</p>
      </div>
    </QuantPage>
  );
}