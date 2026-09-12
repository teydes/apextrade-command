import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Waves } from 'lucide-react';

export default function StationarityTest() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 15) return [{ label: 'ADF', value: 'N/A' }];
    const n = pnls.length;
    // Régression OLS: Δy_t = α + β·y_{t-1} (test ADF simplifié)
    let cumul = 0;
    const levels = pnls.map(p => { cumul += p; return cumul; });
    const dy = levels.slice(1).map((y, i) => y - levels[i]);
    const x = levels.slice(0, -1);
    const nx = x.length;
    const mx = x.reduce((a, b) => a + b, 0) / nx;
    const my = dy.reduce((a, b) => a + b, 0) / nx;
    let num = 0, den = 0;
    for (let i = 0; i < nx; i++) { num += (x[i] - mx) * (dy[i] - my); den += Math.pow(x[i] - mx, 2); }
    const beta = den > 0 ? num / den : 0;
    const resid = dy.map((y, i) => y - (my + beta * (x[i] - mx)));
    const sse = resid.reduce((s, r) => s + r * r, 0);
    const se = den > 0 ? Math.sqrt(sse / (nx - 2) / den) : 1;
    const adfStat = se > 0 ? beta / se : 0;
    const isStationary = adfStat < -2.86;
    return [
      { label: 'ADF Statistic', value: adfStat.toFixed(3), color: isStationary ? 'text-primary' : 'text-red-400' },
      { label: 'Stationnarité', value: isStationary ? 'Oui (5%)' : 'Non', color: isStationary ? 'text-primary' : 'text-yellow-400' },
      { label: 'β (lag-1)', value: beta.toFixed(5), color: beta < 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Échantillon', value: n.toString(), color: 'text-foreground' },
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
      title="Stationarity Test (ADF)"
      subtitle="Test Augmented Dickey-Fuller: la courbe d'equity est-elle stationnaire?"
      icon={Waves}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity curve (racine unitaire?)' }}
      aiPrompt="Analyse le test ADF de stationnarité sur la courbe d'equity. Un ADF très négatif (inférieur à -2.86) indique un processus stationnaire: la performance ne dérive pas, l'edge est stable. Un ADF proche de 0 ou positif suggère une racine unitaire: la courbe dérive (trend aléatoire), le drawdown futur peut être bien plus profond que l'historique. Un β de lag-1 négatif = mean reversion de l'equity."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">ADF</strong>: Δy_t = α + β·y_(t-1) + ε — test de racine unitaire</p>
        <p>Une equity stationnaire = edge stable; une racine unitaire = drift imprévisible.</p>
      </div>
    </QuantPage>
  );
}