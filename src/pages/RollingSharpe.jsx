import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function RollingSharpe() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 20) return [{ label: 'Rolling Sharpe', value: 'N/A' }];
    const window = 20;
    const sharpes = [];
    for (let i = window; i <= pnls.length; i++) {
      const slice = pnls.slice(i - window, i);
      const m = slice.reduce((a, b) => a + b, 0) / window;
      const v = slice.reduce((s, p) => s + Math.pow(p - m, 2), 0) / (window - 1);
      const s = Math.sqrt(v);
      if (s > 0) sharpes.push(m / s);
    }
    if (sharpes.length === 0) return [{ label: 'Rolling Sharpe', value: 'N/A' }];
    const avgSharpe = sharpes.reduce((a, b) => a + b, 0) / sharpes.length;
    const minSharpe = Math.min(...sharpes);
    const maxSharpe = Math.max(...sharpes);
    const pctPositive = sharpes.filter(s => s > 0).length / sharpes.length * 100;
    return [
      { label: 'Avg Rolling Sharpe', value: avgSharpe.toFixed(3), color: avgSharpe > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Min Sharpe', value: minSharpe.toFixed(3), color: minSharpe > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Max Sharpe', value: maxSharpe.toFixed(3), color: 'text-primary' },
      { label: '% Périodes > 0', value: pctPositive.toFixed(0) + '%', color: pctPositive > 70 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 20) return [];
    const window = 20;
    const result = [];
    for (let i = window; i <= pnls.length; i++) {
      const slice = pnls.slice(i - window, i);
      const m = slice.reduce((a, b) => a + b, 0) / window;
      const v = slice.reduce((s, p) => s + Math.pow(p - m, 2), 0) / (window - 1);
      const s = Math.sqrt(v);
      result.push({ name: `T${i}`, value: s > 0 ? m / s : 0 });
    }
    return result;
  };

  return (
    <QuantPage
      title="Rolling Sharpe Ratio"
      subtitle="Sharpe glissant sur fenêtre de 20 trades (stabilité temporelle)"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Sharpe glissant (window=20)', refLine: 0 }}
      aiPrompt="Analyse le Rolling Sharpe. La stabilité du Sharpe dans le temps est cruciale. Si le Sharpe glissant passe souvent en négatif, la stratégie n'est pas robuste. Un Sharpe qui décroît = détérioration. Identifie les périodes de sous-performance."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-60).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Rolling Sharpe</strong> = moyenne / écart-type sur fenêtre glissante de 20 trades</p>
        <p>Montre comment le ratio rendement/risque évolue dans le temps.</p>
      </div>
    </QuantPage>
  );
}