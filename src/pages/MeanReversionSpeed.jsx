import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { RotateCcw } from 'lucide-react';

export default function MeanReversionSpeed() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 8) return [{ label: 'Half-Life', value: 'N/A' }];
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const prevPnls = pnls.slice(0, -1);
    const currPnls = pnls.slice(1);
    const prevMean = prevPnls.reduce((a, b) => a + b, 0) / prevPnls.length;
    let num = 0, den = 0;
    for (let i = 0; i < prevPnls.length; i++) {
      num += (currPnls[i] - mean) * (prevPnls[i] - prevMean);
      den += (prevPnls[i] - prevMean) ** 2;
    }
    const phi = den > 0 ? num / den : 0;
    const halfLife = phi > 0 && phi < 1 ? -Math.log(2) / Math.log(phi) : Infinity;
    const reversionSpeed = (1 - phi) * 100;
    return [
      { label: 'Half-Life', value: isFinite(halfLife) ? halfLife.toFixed(1) + ' trades' : '∞', color: halfLife < 10 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Reversion Speed', value: reversionSpeed.toFixed(1) + '%', color: reversionSpeed > 20 ? 'text-primary' : 'text-muted-foreground' },
      { label: 'Phi (AR1)', value: phi.toFixed(3), color: phi < 0.9 ? 'text-primary' : 'text-red-400' },
      { label: 'Régime', value: halfLife < 5 ? 'Mean-Reversion' : halfLife > 20 ? 'Tendance' : 'Mixte', color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0;
    return closed.slice(-40).map((t, i) => {
      cumul += t.pnl || 0;
      return { name: `T${i + 1}`, value: cumul };
    });
  };

  return (
    <QuantPage
      title="Mean Reversion Speed"
      subtitle="Half-life de réversion: vitesse de retour à la moyenne"
      icon={RotateCcw}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity Curve et réversion' }}
      aiPrompt="Analyse la vitesse de mean reversion. Une half-life courte (< 5 trades) indique que les écarts se corrigent vite = stratégie mean-reversion efficace. Une half-life longue (> 20) indique des tendances persistantes."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Half-Life</strong> = -ln(2) / ln(φ) où φ est le coefficient AR(1)</p>
        <p>La half-life mesure le temps moyen pour que la moitié d'un écart se corrige.</p>
      </div>
    </QuantPage>
  );
}