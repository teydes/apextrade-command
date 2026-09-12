import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function BetaStability() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && (t.lot_size || t.quantity));
    if (closed.length < 10) return [{ label: 'β Stability', value: 'N/A' }];
    const points = closed.map(t => ({ y: t.pnl, x: t.lot_size || t.quantity || 1 }));
    const betaOf = (arr) => {
      const n = arr.length;
      if (n < 3) return 0;
      const mx = arr.reduce((s, p) => s + p.x, 0) / n;
      const my = arr.reduce((s, p) => s + p.y, 0) / n;
      let num = 0, den = 0;
      for (const p of arr) { num += (p.x - mx) * (p.y - my); den += Math.pow(p.x - mx, 2); }
      return den > 0 ? num / den : 0;
    };
    const half = Math.floor(points.length / 2);
    const beta1 = betaOf(points.slice(0, half));
    const beta2 = betaOf(points.slice(half));
    const betaFull = betaOf(points);
    const drift = Math.abs(beta2 - beta1);
    const stability = Math.abs(betaFull) > 0 ? Math.max(0, 100 - (drift / Math.abs(betaFull)) * 100) : 0;
    const rSquared = (() => {
      const n = points.length;
      const mx = points.reduce((s, p) => s + p.x, 0) / n;
      const my = points.reduce((s, p) => s + p.y, 0) / n;
      let num = 0, dx = 0, dy = 0;
      for (const p of points) { num += (p.x - mx) * (p.y - my); dx += Math.pow(p.x - mx, 2); dy += Math.pow(p.y - my, 2); }
      const r = dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0;
      return r * r;
    })();
    return [
      { label: 'β (PnL/Lot)', value: betaFull.toFixed(2), color: betaFull > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'β Stability', value: stability.toFixed(0) + '%', color: stability > 60 ? 'text-primary' : 'text-red-400' },
      { label: 'Drift', value: drift.toFixed(2), color: drift < Math.abs(betaFull) * 0.3 ? 'text-primary' : 'text-yellow-400' },
      { label: 'R²', value: rSquared.toFixed(3), color: rSquared > 0.5 ? 'text-primary' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const half = Math.floor(closed.length / 2);
    return closed.slice(-40).map((t, i) => ({
      name: `T${i + 1}`,
      H1: i < half / 2 ? t.pnl : null,
      H2: t.pnl,
      Lot: t.lot_size || t.quantity || 1,
    }));
  };

  return (
    <QuantPage
      title="Beta Stability (Size Sensitivity)"
      subtitle="Sensibilité du PnL à la taille de position — stable dans le temps?"
      icon={Activity}
      metrics={metrics}
      chartData={(trades) => {
        const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && (t.lot_size || t.quantity));
        const half = Math.floor(closed.length / 2);
        const betaOf = (arr) => {
          const n = arr.length;
          if (n < 3) return 0;
          const mx = arr.reduce((s, p) => s + (p.lot_size || p.quantity || 1), 0) / n;
          const my = arr.reduce((s, p) => s + p.pnl, 0) / n;
          let num = 0, den = 0;
          for (const p of arr) { num += ((p.lot_size || p.quantity || 1) - mx) * (p.pnl - my); den += Math.pow((p.lot_size || p.quantity || 1) - mx, 2); }
          return den > 0 ? num / den : 0;
        };
        const window = Math.max(10, half);
        const result = [];
        for (let i = window; i <= closed.length; i += 5) {
          result.push({ name: `T${i}`, value: betaOf(closed.slice(i - window, i)) });
        }
        return result;
      }}
      chartType="line"
      chartConfig={{ title: 'β glissant (PnL par lot)', refLine: 0 }}
      aiPrompt="Analyse la stabilité du beta de taille. Le beta mesure le PnL par unité de lot: c'est la sensibilité réelle de la stratégie à la taille de position. Un beta stable dans le temps = la stratégie scale de manière prévisible. Un beta qui dérive = l'efficacité marginale des lots change (impact de marché ou adaptation) — ne doublez pas la taille sans re-valider."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, lot: t.lot_size || t.quantity, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">β</strong> = cov(PnL, Lot) / var(Lot) — sensibilité à la taille</p>
        <p>Un β stable valide le scaling: doubler les lots doublera le PnL attendu.</p>
      </div>
    </QuantPage>
  );
}