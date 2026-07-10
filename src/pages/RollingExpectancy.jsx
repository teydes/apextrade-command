import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function RollingExpectancy() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 20) return [{ label: 'Rolling E[R]', value: 'N/A' }];
    const window = 20;
    const expectations = [];
    for (let i = window; i <= pnls.length; i++) {
      const slice = pnls.slice(i - window, i);
      const mean = slice.reduce((a, b) => a + b, 0) / window;
      expectations.push(mean);
    }
    const avg = expectations.reduce((a, b) => a + b, 0) / expectations.length;
    const min = Math.min(...expectations);
    const max = Math.max(...expectations);
    const current = expectations[expectations.length - 1];
    const consistency = avg > 0 ? (expectations.filter(e => e > 0).length / expectations.length) * 100 : 0;
    return [
      { label: 'Avg E[R]', value: avg.toFixed(2), color: avg > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Current E[R]', value: current.toFixed(2), color: current > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Min E[R]', value: min.toFixed(2), color: 'text-red-400' },
      { label: '% Positive', value: consistency.toFixed(0) + '%', color: consistency > 70 ? 'text-primary' : 'text-red-400' },
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
      const mean = slice.reduce((a, b) => a + b, 0) / window;
      result.push({ name: `T${i}`, value: mean });
    }
    return result;
  };

  return (
    <QuantPage
      title="Rolling Expectancy"
      subtitle="Expectancy glissante (PnL moyen par trade sur 20 trades)"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Expectancy glissante (window=20)', refLine: 0 }}
      aiPrompt="Analyse la rolling expectancy. C'est le PnL moyen par trade sur une fenêtre glissante. Une expectancy toujours positive = stratégie robuste. Des passages en négatif = périodes de perte. Le % positif > 70% indique une stratégie fiable dans le temps."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Rolling Expectancy</strong> = PnL moyen par trade sur fenêtre glissante</p>
        <p>L'expectancy glissante révèle les cycles de performance de la stratégie.</p>
      </div>
    </QuantPage>
  );
}