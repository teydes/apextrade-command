import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { TrendingDown } from 'lucide-react';

export default function BurkeRatio() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 2) return [{ label: 'Burke', value: 'N/A' }];
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    let cumul = 0, peak = 0, sumSqDD = 0;
    for (const p of pnls) {
      cumul += p;
      if (cumul > peak) peak = cumul;
      const dd = peak - cumul;
      if (dd > 0) sumSqDD += dd * dd;
    }
    const burke = Math.sqrt(sumSqDD / closed.length) !== 0 ? mean / Math.sqrt(sumSqDD / closed.length) : 0;
    return [
      { label: 'Burke Ratio', value: burke.toFixed(3), color: burke > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Rendement moyen', value: mean.toFixed(2), color: mean >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'DD² moyen', value: (sumSqDD / closed.length).toFixed(2), color: 'text-foreground' },
      { label: 'Quality', value: burke > 1 ? 'Excellent' : burke > 0 ? 'Acceptable' : 'Mauvais', color: burke > 1 ? 'text-primary' : burke > 0 ? 'text-yellow-400' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0, peak = 0;
    return closed.slice(-50).map((t, i) => {
      cumul += t.pnl || 0;
      if (cumul > peak) peak = cumul;
      return { name: `T${i + 1}`, value: Math.sqrt(Math.max(peak - cumul, 0)) };
    });
  };

  return (
    <QuantPage
      title="Burke Ratio"
      subtitle="Ratio de Sharpe modifié utilisant les drawdowns au lieu de la volatilité"
      icon={TrendingDown}
      metrics={metrics}
      chartData={chartData}
      chartType="area"
      chartConfig={{ title: '√Drawdown (Burke)' }}
      aiPrompt="Analyse le Burke Ratio. Similaire au Sharpe mais utilise la racine carrée des drawdowns au lieu de l'écart-type. Un Burke > 1 est excellent. Identifie si les drawdowns dominent le profil de risque."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-30).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Burke Ratio</strong> = Rendement / √(Σ DD² / n)</p>
        <p>Le Burke améliore le Sharpe en ne pénalisant que les drawdowns réels, pas la volatilité haussière.</p>
      </div>
    </QuantPage>
  );
}