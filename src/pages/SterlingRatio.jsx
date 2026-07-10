import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Scale } from 'lucide-react';

export default function SterlingRatio() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 3) return [{ label: 'Sterling', value: 'N/A' }];
    let cumul = 0, peak = 0, drawdowns = [];
    for (const t of closed) {
      cumul += t.pnl || 0;
      if (cumul > peak) peak = cumul;
      const dd = peak - cumul;
      if (dd > 0) drawdowns.push(dd);
    }
    const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
    const avgDD = drawdowns.length > 0 ? drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length : 0;
    const maxDD = drawdowns.length > 0 ? Math.max(...drawdowns) : 0;
    const sterling = avgDD > 0 ? totalPnl / avgDD : 0;
    return [
      { label: 'Sterling Ratio', value: sterling.toFixed(3), color: sterling > 1 ? 'text-primary' : 'text-red-400' },
      { label: 'PnL Total', value: totalPnl.toFixed(2), color: totalPnl >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Avg Drawdown', value: avgDD.toFixed(2), color: 'text-foreground' },
      { label: 'Max Drawdown', value: maxDD.toFixed(2), color: 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0, peak = 0;
    return closed.slice(-50).map((t, i) => {
      cumul += t.pnl || 0;
      if (cumul > peak) peak = cumul;
      return { name: `T${i + 1}`, value: cumul, dd: peak - cumul };
    });
  };

  return (
    <QuantPage
      title="Sterling Ratio"
      subtitle="Rendement total / drawdown moyen absolu"
      icon={Scale}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity & Drawdowns' }}
      aiPrompt="Analyse le Sterling Ratio. Un ratio > 1 signifie que le rendement total dépasse le drawdown moyen. Évalue la régularité du rendement face aux pertes moyennes."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-30).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Sterling Ratio</strong> = PnL Total / Drawdown moyen</p>
        <p>Le Sterling mesure le rendement par rapport au drawdown moyen, pas au max drawdown comme le Calmar.</p>
      </div>
    </QuantPage>
  );
}