import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Grid3x3 } from 'lucide-react';

export default function FractalDimension() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 10) return [{ label: 'FD', value: 'N/A' }];
    const n = pnls.length;
    let cumul = 0;
    const equity = pnls.map(p => { cumul += p; return cumul; });
    const length = equity.reduce((s, v, i) => i > 0 ? s + Math.sqrt(1 + Math.pow(v - equity[i - 1], 2)) : s, 0);
    const maxRange = Math.max(...equity) - Math.min(...equity);
    const fd = maxRange > 0 ? Math.log(length / Math.max(maxRange, 1)) / Math.log(Math.max(n, 2)) : 1.5;
    const regime = fd < 1.2 ? 'Tendance forte' : fd > 1.5 ? 'Choppy/Aléatoire' : 'Mixte';
    return [
      { label: 'Fractal Dim.', value: fd.toFixed(3), color: fd < 1.2 ? 'text-primary' : fd > 1.5 ? 'text-red-400' : 'text-yellow-400' },
      { label: 'Régime', value: regime, color: fd < 1.2 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Path Length', value: length.toFixed(2), color: 'text-foreground' },
      { label: 'Range', value: maxRange.toFixed(2), color: 'text-foreground' },
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
      title="Fractal Dimension"
      subtitle="Complexité de la courbe d'équity (tendance vs bruit)"
      icon={Grid3x3}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity Curve complexity' }}
      aiPrompt="Analyse la Fractal Dimension. FD proche de 1 = courbe lisse (tendance forte). FD proche de 1.5 = courbe bruitée (marche aléatoire). FD proche de 2 = extrêmement choppy. Évalue la prévisibilité de l'equity curve."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Fractal Dimension</strong> = log(L/R) / log(n)</p>
        <p>Une FD basse indique une tendance prévisible. Une FD haute indique du bruit et de l'imprévisibilité.</p>
      </div>
    </QuantPage>
  );
}