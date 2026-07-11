import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Scale } from 'lucide-react';

export default function GiniCoefficient() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl).sort((a, b) => a - b);
    if (pnls.length < 5) return [{ label: 'Gini', value: 'N/A' }];
    const n = pnls.length;
    const sum = pnls.reduce((a, b) => a + b, 0);
    const absSum = pnls.reduce((s, p) => s + Math.abs(p), 0);
    let cumSum = 0;
    let giniSum = 0;
    for (let i = 0; i < n; i++) {
      cumSum += pnls[i];
      giniSum += (2 * (i + 1) - n - 1) * pnls[i];
    }
    const gini = absSum > 0 ? giniSum / (n * absSum) : 0;
    const concentration = Math.abs(gini);
    const top10pct = pnls.slice(-Math.max(Math.floor(n * 0.1), 1));
    const top10Share = absSum > 0 ? top10pct.reduce((s, p) => s + Math.abs(p), 0) / absSum * 100 : 0;
    return [
      { label: 'Gini', value: gini.toFixed(3), color: concentration < 0.3 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Concentration', value: concentration < 0.3 ? 'Faible' : concentration < 0.6 ? 'Modérée' : 'Élevée', color: concentration < 0.3 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Top 10% Share', value: top10Share.toFixed(0) + '%', color: top10Share < 30 ? 'text-primary' : 'text-red-400' },
      { label: 'Total', value: sum.toFixed(2), color: sum >= 0 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl).sort((a, b) => a - b);
    if (pnls.length < 5) return [];
    const n = pnls.length;
    const absSum = pnls.reduce((s, p) => s + Math.abs(p), 0);
    let cumul = 0;
    const lorenz = [{ name: '0%', value: 0 }];
    for (let i = 0; i < n; i++) {
      cumul += Math.abs(pnls[i]);
      lorenz.push({ name: `${((i + 1) / n * 100).toFixed(0)}%`, value: absSum > 0 ? (cumul / absSum) * 100 : 0 });
    }
    return lorenz;
  };

  return (
    <QuantPage
      title="Gini Coefficient"
      subtitle="Inégalité de la distribution des PnL (concentration du risque)"
      icon={Scale}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Courbe de Lorenz (distribution |PnL|)' }}
      aiPrompt="Analyse le coefficient de Gini. Gini proche de 0 = PnL également réparti (chaque trade contribue de façon similaire). Gini proche de 1 = PnL très concentré (quelques trades dominent). Une concentration élevée (top 10% > 30%) signifie que la stratégie dépend de quelques gros trades = fragile. Visez un Gini < 0.3."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Gini</strong> = Σ(2i − n − 1) × Xᵢ / (n × Σ|X|)</p>
        <p>La courbe de Lorenz visualise la concentration: plus elle s'écarte de la diagonale, plus le PnL est concentré.</p>
      </div>
    </QuantPage>
  );
}