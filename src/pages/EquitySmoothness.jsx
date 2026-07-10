import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function EquitySmoothness() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'Smoothness', value: 'N/A' }];
    let cumul = 0;
    const equity = pnls.map(p => { cumul += p; return cumul; });
    const n = equity.length;
    let totalChange = 0;
    let totalAbsChange = 0;
    for (let i = 1; i < n; i++) {
      const change = equity[i] - equity[i - 1];
      totalChange += change;
      totalAbsChange += Math.abs(change);
    }
    const smoothness = totalAbsChange > 0 ? Math.abs(totalChange) / totalAbsChange : 0;
    const r2 = (() => {
      const x = Array.from({ length: n }, (_, i) => i);
      const xMean = x.reduce((a, b) => a + b, 0) / n;
      const yMean = equity.reduce((a, b) => a + b, 0) / n;
      let num = 0, denX = 0, denY = 0;
      for (let i = 0; i < n; i++) {
        num += (x[i] - xMean) * (equity[i] - yMean);
        denX += Math.pow(x[i] - xMean, 2);
        denY += Math.pow(equity[i] - yMean, 2);
      }
      const r = denX > 0 && denY > 0 ? num / Math.sqrt(denX * denY) : 0;
      return r * r;
    })();
    const jaggedness = 1 - smoothness;
    return [
      { label: 'Smoothness', value: (smoothness * 100).toFixed(0) + '%', color: smoothness > 0.6 ? 'text-primary' : 'text-yellow-400' },
      { label: 'R² (linéarité)', value: r2.toFixed(3), color: r2 > 0.8 ? 'text-primary' : r2 > 0.5 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'Jaggedness', value: (jaggedness * 100).toFixed(0) + '%', color: jaggedness < 0.4 ? 'text-primary' : 'text-red-400' },
      { label: 'Total PnL', value: cumul.toFixed(2), color: cumul >= 0 ? 'text-primary' : 'text-red-400' },
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
      title="Equity Smoothness Score"
      subtitle="Lissage de la courbe d'equity (smoothness, R², jaggedness)"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity Curve (smoothness)' }}
      aiPrompt="Analyse le smoothness de l'equity curve. Une courbe lisse (smoothness > 60%, R² > 0.8) = stratégie stable et prévisible. Une courbe en dents de scie (jaggedness > 40%) = volatile et stressante. Le R² mesure la linéarité de la progression. Une equity curve idéale ressemble à une ligne droite."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Smoothness</strong> = |Σ change| / Σ |change| — mesure de linéarité</p>
        <p><strong className="text-foreground">R²</strong>: coefficient de détermination (fit linéaire de l'equity)</p>
      </div>
    </QuantPage>
  );
}