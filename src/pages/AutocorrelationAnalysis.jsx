import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function AutocorrelationAnalysis() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 8) return [{ label: 'Autocorr', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const variance = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / n;
    const autocorr = (lag) => {
      let num = 0;
      for (let i = lag; i < n; i++) num += (pnls[i] - mean) * (pnls[i - lag] - mean);
      return variance > 0 ? num / ((n - lag) * variance) : 0;
    };
    const ac1 = autocorr(1);
    const ac2 = autocorr(2);
    const ac3 = autocorr(3);
    const ljungBox = n * (ac1 * ac1 + ac2 * ac2 + ac3 * ac3) / (n - 3);
    const isSignificant = Math.abs(ac1) > 2 / Math.sqrt(n);
    return [
      { label: 'AC(1)', value: ac1.toFixed(3), color: Math.abs(ac1) < 0.2 ? 'text-primary' : 'text-yellow-400' },
      { label: 'AC(2)', value: ac2.toFixed(3), color: 'text-foreground' },
      { label: 'Ljung-Box', value: ljungBox.toFixed(2), color: ljungBox < 7.81 ? 'text-primary' : 'text-red-400' },
      { label: 'Significatif', value: isSignificant ? 'Oui' : 'Non', color: !isSignificant ? 'text-primary' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 8) return [];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const variance = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / n;
    const lags = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    return lags.map(lag => {
      let num = 0;
      for (let i = lag; i < n; i++) num += (pnls[i] - mean) * (pnls[i - lag] - mean);
      return { name: `Lag ${lag}`, value: variance > 0 ? num / ((n - lag) * variance) : 0 };
    });
  };

  return (
    <QuantPage
      title="Autocorrelation Analysis"
      subtitle="Dépendance temporelle entre trades consécutifs"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Autocorrélogramme', refLine: 0 }}
      aiPrompt="Analyse l'autocorrélation. Si AC(1) est significative (> 2/√n), les trades consécutifs ne sont pas indépendants. Cela invalide les métriques qui supposent l'indépendance (comme le Sharpe classique). Une autocorrélation positive = clustering de wins/losses (tilt?). Le test de Ljung-Box vérifie l'indépendance globale."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Autocorrélation AC(k)</strong>: corrélation entre PnL(t) et PnL(t-k)</p>
        <p>AC significative = les trades ne sont PAS indépendants → métriques classiques biaisées.</p>
      </div>
    </QuantPage>
  );
}