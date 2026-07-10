import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Layers3 } from 'lucide-react';

export default function VolatilityClustering() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 8) return [{ label: 'GARCH', value: 'N/A' }];
    const absPnls = pnls.map(Math.abs);
    const mean = absPnls.reduce((a, b) => a + b, 0) / absPnls.length;
    let highVol = 0, lowVol = 0;
    for (let i = 1; i < absPnls.length; i++) {
      if (absPnls[i] > mean && absPnls[i - 1] > mean) highVol++;
      if (absPnls[i] < mean && absPnls[i - 1] < mean) lowVol++;
    }
    const clustering = ((highVol + lowVol) / (absPnls.length - 1)) * 100;
    const lag1 = (() => {
      let num = 0, den = 0;
      const m = absPnls.reduce((a, b) => a + b, 0) / absPnls.length;
      for (let i = 1; i < absPnls.length; i++) {
        num += (absPnls[i] - m) * (absPnls[i - 1] - m);
        den += Math.pow(absPnls[i - 1] - m, 2);
      }
      return den > 0 ? num / den : 0;
    })();
    return [
      { label: 'Clustering %', value: clustering.toFixed(0) + '%', color: clustering > 60 ? 'text-yellow-400' : 'text-primary' },
      { label: 'Autocorr AR(1)', value: lag1.toFixed(3), color: lag1 > 0.3 ? 'text-yellow-400' : 'text-primary' },
      { label: 'Avg Volatility', value: mean.toFixed(2), color: 'text-foreground' },
      { label: 'Max Volatility', value: Math.max(...absPnls).toFixed(2), color: 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    return closed.slice(-60).map((t, i) => ({
      name: `T${i + 1}`,
      value: Math.abs(t.pnl || 0),
    }));
  };

  return (
    <QuantPage
      title="Volatility Clustering"
      subtitle="Détection des régimes de volatilité (type GARCH)"
      icon={Layers3}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Volatilité absolue des trades' }}
      aiPrompt="Analyse le Volatility Clustering. Une autocorrélation > 0.3 des valeurs absolues indique que la volatilité se regroupe: les périodes volatiles succèdent aux volatiles. Pratique pour ajuster la taille de position selon le régime de vol."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Volatility Clustering</strong>: les périodes de forte volatilité tendent à se succéder</p>
        <p>Autocorrélation AR(1) des |PnL| &gt; 0.3 = clustering significatif (effet GARCH).</p>
      </div>
    </QuantPage>
  );
}