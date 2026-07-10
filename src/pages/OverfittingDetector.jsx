import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { AlertTriangle } from 'lucide-react';

export default function OverfittingDetector() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 8) return [{ label: 'Overfit', value: 'N/A' }];
    const n = closed.length;
    const half = Math.floor(n / 2);
    const firstHalf = closed.slice(0, half);
    const secondHalf = closed.slice(half);
    const wr1 = firstHalf.filter(t => t.pnl > 0).length / firstHalf.length;
    const wr2 = secondHalf.filter(t => t.pnl > 0).length / secondHalf.length;
    const avg1 = firstHalf.reduce((s, t) => s + (t.pnl || 0), 0) / firstHalf.length;
    const avg2 = secondHalf.reduce((s, t) => s + (t.pnl || 0), 0) / secondHalf.length;
    const wrStability = wr1 > 0 ? Math.abs(wr1 - wr2) / wr1 : 1;
    const pnlStability = avg1 !== 0 ? Math.abs(avg1 - avg2) / Math.abs(avg1) : 1;
    const symbols = new Set(closed.map(t => t.symbol)).size;
    const strategies = new Set(closed.map(t => t.strategy).filter(Boolean)).size;
    const diversityScore = Math.min(symbols / 3, 1) * 50 + Math.min(strategies / 3, 1) * 50;
    const overfitScore = (wrStability * 40 + pnlStability * 40 + (1 - diversityScore / 100) * 20);
    return [
      { label: 'Overfit Score', value: overfitScore.toFixed(0) + '/100', color: overfitScore < 30 ? 'text-primary' : overfitScore < 50 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'WR Stabilité', value: (wrStability * 100).toFixed(0) + '%', color: wrStability < 0.15 ? 'text-primary' : 'text-red-400' },
      { label: 'PnL Stabilité', value: (pnlStability * 100).toFixed(0) + '%', color: pnlStability < 0.2 ? 'text-primary' : 'text-red-400' },
      { label: 'Diversité', value: diversityScore.toFixed(0) + '/100', color: diversityScore > 60 ? 'text-primary' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const half = Math.floor(closed.length / 2);
    const firstHalf = closed.slice(0, half);
    const secondHalf = closed.slice(half);
    let c1 = 0, c2 = 0;
    return [
      ...firstHalf.map((t, i) => { c1 += t.pnl || 0; return { name: `1-${i + 1}`, value: c1 }; }),
      ...secondHalf.map((t, i) => { c2 += t.pnl || 0; return { name: `2-${i + 1}`, value: c1 + c2 }; }),
    ];
  };

  return (
    <QuantPage
      title="Overfitting Detector"
      subtitle="Stabilité temporelle et diversité de la stratégie"
      icon={AlertTriangle}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Stabilité de l\'Equity Curve (split médian)' }}
      aiPrompt="Analyse l'Overfitting Score. Un score < 30 indique une stratégie robuste, 30-50 = modérément overfittée, > 50 = overfitting sévère. Vérifie la stabilité du win rate et du PnL moyen entre la première et seconde moitié des trades."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, symbol: t.symbol, strategy: t.strategy })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Overfit Score</strong> = WR Stabilité (40%) + PnL Stabilité (40%) + Diversité inversée (20%)</p>
        <p>Détecte si les performances sont stables dans le temps ou artefactuelles.</p>
      </div>
    </QuantPage>
  );
}