import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function RollingVolatility() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 20) return [{ label: 'Rolling Vol', value: 'N/A' }];
    const window = 20;
    const vols = [];
    for (let i = window; i <= pnls.length; i++) {
      const slice = pnls.slice(i - window, i);
      const m = slice.reduce((a, b) => a + b, 0) / window;
      const v = slice.reduce((s, p) => s + Math.pow(p - m, 2), 0) / (window - 1);
      vols.push(Math.sqrt(v));
    }
    const avg = vols.reduce((a, b) => a + b, 0) / vols.length;
    const max = Math.max(...vols);
    const min = Math.min(...vols);
    const current = vols[vols.length - 1];
    const volRatio = avg > 0 ? current / avg : 1;
    return [
      { label: 'Avg Volatility', value: avg.toFixed(2), color: 'text-foreground' },
      { label: 'Max Vol', value: max.toFixed(2), color: 'text-red-400' },
      { label: 'Min Vol', value: min.toFixed(2), color: 'text-primary' },
      { label: 'Current/Avg', value: volRatio.toFixed(2), color: volRatio < 1 ? 'text-primary' : 'text-yellow-400' },
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
      result.push({ name: `T${i}`, value: Math.sqrt(v) });
    }
    return result;
  };

  return (
    <QuantPage
      title="Rolling Volatility"
      subtitle="Volatilité glissante (écart-type sur fenêtre de 20 trades)"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Volatilité glissante (window=20)' }}
      aiPrompt="Analyse la volatilité glissante. Une volatilité qui augmente = le trading devient plus risqué (peut-être plus de taille ou des conditions de marché volatiles). Une volatilité stable = trading discipliné. Le ratio current/avg > 1.5 indique un pic de volatilité = prudence."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Rolling Volatility</strong> = écart-type glissant (window=20)</p>
        <p>La volatilité glissante révèle les changements de régime de risque dans le temps.</p>
      </div>
    </QuantPage>
  );
}