import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { TrendingUp } from 'lucide-react';

export default function UpsidePotential() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'Upside Pot.', value: 'N/A' }];
    const n = pnls.length;
    const mar = 0; // minimum acceptable return
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const upsideReturns = pnls.filter(p => p > mar);
    const downsideReturns = pnls.filter(p => p < mar);
    const upsideAvg = upsideReturns.length > 0 ? upsideReturns.reduce((a, b) => a + b, 0) / upsideReturns.length : 0;
    const downsideDev = Math.sqrt(downsideReturns.length > 0 ? downsideReturns.reduce((s, p) => s + Math.pow(p - mar, 2), 0) / downsideReturns.length : 0);
    const upsidePotential = upsideReturns.length > 0 ? upsideReturns.reduce((s, p) => s + Math.max(p - mar, 0), 0) / n : 0;
    const ratio = downsideDev > 0 ? upsidePotential / downsideDev : 0;
    return [
      { label: 'Upside Pot. Ratio', value: ratio.toFixed(3), color: ratio > 1 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Upside Pot.', value: upsidePotential.toFixed(3), color: 'text-primary' },
      { label: 'Downside Dev.', value: downsideDev.toFixed(2), color: 'text-red-400' },
      { label: 'Avg Upside', value: upsideAvg.toFixed(2), color: 'text-primary' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [];
    const upside = pnls.filter(p => p > 0).map(p => p);
    const downside = pnls.filter(p => p < 0).map(p => Math.abs(p));
    const upAvg = upside.length > 0 ? upside.reduce((a, b) => a + b, 0) / upside.length : 0;
    const dnAvg = downside.length > 0 ? downside.reduce((a, b) => a + b, 0) / downside.length : 0;
    return [
      { name: 'Avg Upside', value: upAvg },
      { name: 'Avg Downside', value: dnAvg },
    ];
  };

  return (
    <QuantPage
      title="Upside Potential Ratio"
      subtitle="Gains potentiels ajustés au risque de downside"
      icon={TrendingUp}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Upside vs Downside moyen', refLine: 0 }}
      aiPrompt="Analyse l'Upside Potential Ratio. Similaire au Sortino mais utilise l'espérance des gains au-dessus du MAR au lieu de la moyenne. Un ratio > 1 indique plus de potentiel haussier que de risque baissier."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Upside Potential</strong> = E[max(R−MAR, 0)] / √(Σ(R−MAR)² / n) pour R &lt; MAR</p>
        <p>Améliore le Sortino en mesurant le potentiel haussier réel, pas juste l'absence de volatilité baissière.</p>
      </div>
    </QuantPage>
  );
}