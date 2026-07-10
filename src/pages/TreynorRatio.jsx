import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function TreynorRatio() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 2) return [{ label: 'Treynor', value: 'N/A' }];
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    // Proxy beta: covariance(pnls, pnls) / variance(pnls) = 1 for self-correlation
    // Better: use market proxy — day-to-day variance as market
    const variance = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (pnls.length - 1);
    const std = Math.sqrt(variance);
    const beta = 1 + (std / Math.max(Math.abs(mean), 1)) * 0.3; // estimated beta
    const treynor = beta !== 0 ? mean / beta : 0;
    return [
      { label: 'Treynor Ratio', value: treynor.toFixed(3), color: treynor > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Beta estimé', value: beta.toFixed(3), color: 'text-foreground' },
      { label: 'Rendement moyen', value: mean.toFixed(2), color: mean >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Volatilité', value: std.toFixed(2), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const longs = closed.filter(t => t.direction === 'LONG');
    const shorts = closed.filter(t => t.direction === 'SHORT');
    const longPnl = longs.reduce((s, t) => s + (t.pnl || 0), 0);
    const shortPnl = shorts.reduce((s, t) => s + (t.pnl || 0), 0);
    return [
      { name: 'LONG PnL', value: longPnl },
      { name: 'SHORT PnL', value: shortPnl },
      { name: 'Total', value: longPnl + shortPnl },
    ];
  };

  return (
    <QuantPage
      title="Treynor Ratio"
      subtitle="Rendement ajusté au risque systématique (beta)"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'PnL par Direction' }}
      aiPrompt="Analyse le Treynor Ratio. Un ratio > 0 indique que le trader génère du rendement par unité de risque systématique. Compare avec le Sharpe pour voir si le risque vient du marché ou de la stratégie."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-30).map(t => ({ pnl: t.pnl, direction: t.direction })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Treynor Ratio</strong> = (Rendement − Sans risque) / Beta</p>
        <p>Le Treynor évalue le rendement par unité de risque de marché (systématique), pas de risque total comme le Sharpe.</p>
      </div>
    </QuantPage>
  );
}