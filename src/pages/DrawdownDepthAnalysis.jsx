import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { TrendingDown } from 'lucide-react';

export default function DrawdownDepthAnalysis() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'DD Depth', value: 'N/A' }];
    let cumul = 0, peak = 0, drawdowns = [];
    for (const t of closed) {
      cumul += t.pnl || 0;
      if (cumul > peak) peak = cumul;
      const dd = peak - cumul;
      if (dd > 0) drawdowns.push(dd);
    }
    if (drawdowns.length === 0) return [
      { label: 'Max DD', value: '0', color: 'text-primary' },
      { label: 'Avg DD', value: '0', color: 'text-primary' },
      { label: 'DD Count', value: '0', color: 'text-foreground' },
      { label: 'Severity', value: 'None', color: 'text-primary' },
    ];
    drawdowns.sort((a, b) => b - a);
    const maxDD = drawdowns[0];
    const avgDD = drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length;
    const medianDD = drawdowns[Math.floor(drawdowns.length / 2)];
    const p90 = drawdowns[Math.floor(drawdowns.length * 0.1)];
    const severity = maxDD > avgDD * 3 ? 'Extrême' : maxDD > avgDD * 2 ? 'Élevé' : 'Modéré';
    return [
      { label: 'Max DD', value: maxDD.toFixed(2), color: 'text-red-400' },
      { label: 'Avg DD', value: avgDD.toFixed(2), color: 'text-yellow-400' },
      { label: 'Median DD', value: medianDD.toFixed(2), color: 'text-foreground' },
      { label: 'Severity', value: severity, color: severity === 'Extrême' ? 'text-red-400' : severity === 'Élevé' ? 'text-yellow-400' : 'text-primary' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0, peak = 0;
    return closed.slice(-60).map((t, i) => {
      cumul += t.pnl || 0;
      if (cumul > peak) peak = cumul;
      return { name: `T${i + 1}`, value: peak - cumul };
    });
  };

  return (
    <QuantPage
      title="Drawdown Depth Analysis"
      subtitle="Distribution et profondeur des drawdowns (max, avg, médian, P90)"
      icon={TrendingDown}
      metrics={metrics}
      chartData={chartData}
      chartType="area"
      chartConfig={{ title: 'Underwater curve (drawdowns)' }}
      aiPrompt="Analyse la profondeur des drawdowns. La différence entre max DD et avg DD révèle si le pire cas est exceptionnel ou représentatif. Un ratio max/avg > 3 = le pire drawdown est un événement extrême. Le P90 montre le drawdown typique des 10% pires cas."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">DD Depth</strong>: max, moyenne, médian et P90 des drawdowns</p>
        <p>La distribution des drawdowns est plus informative que le seul maximum.</p>
      </div>
    </QuantPage>
  );
}