import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function LjungBoxTest() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 15) return [{ label: 'Ljung-Box', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const centered = pnls.map(p => p - mean);
    const maxLag = Math.min(10, Math.floor(n / 5));
    const autocorrs = [];
    for (let lag = 1; lag <= maxLag; lag++) {
      let num = 0, den = 0;
      for (let i = 0; i < n - lag; i++) num += centered[i] * centered[i + lag];
      for (let i = 0; i < n; i++) den += centered[i] * centered[i];
      autocorrs.push(den > 0 ? num / den : 0);
    }
    const lb = n * (n + 2) * autocorrs.reduce((s, rk, k) => s + Math.pow(rk, 2) / (n - k - 1), 0);
    const critical = maxLag <= 5 ? 11.07 : maxLag <= 10 ? 18.31 : 23.21;
    const isRandom = lb < critical;
    return [
      { label: 'LB Statistic', value: lb.toFixed(3), color: isRandom ? 'text-primary' : 'text-yellow-400' },
      { label: 'Autocorrélation', value: isRandom ? 'Absente' : 'Présente', color: isRandom ? 'text-primary' : 'text-red-400' },
      { label: 'Max Lag', value: maxLag.toString(), color: 'text-foreground' },
      { label: 'Seuil 5%', value: critical.toFixed(2), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 15) return [];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const centered = pnls.map(p => p - mean);
    const maxLag = Math.min(10, Math.floor(n / 5));
    const result = [];
    for (let lag = 1; lag <= maxLag; lag++) {
      let num = 0, den = 0;
      for (let i = 0; i < n - lag; i++) num += centered[i] * centered[i + lag];
      for (let i = 0; i < n; i++) den += centered[i] * centered[i];
      result.push({ name: `Lag ${lag}`, value: den > 0 ? num / den : 0 });
    }
    return result;
  };

  return (
    <QuantPage
      title="Ljung-Box Autocorrelation Test"
      subtitle="Test de randomness: y a-t-il de l'autocorrélation dans les PnL?"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Autocorrélation par lag', refLine: 0 }}
      aiPrompt="Analyse le test de Ljung-Box. Si LB > seuil, il y a de l'autocorrélation = les trades ne sont pas indépendants. Cela peut indifier: streaks gagnants/perdants, dépendance temporelle, ou que la stratégie a un pattern. Si pas d'autocorrélation, chaque trade est indépendant (ce qui est généralement souhaitable)."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Ljung-Box</strong> = n(n+2) Σ(rₖ²/(n−k)) — test de non-autocorrélation</p>
        <p>Une autocorrélation positive = les gains suivent les gains (momentum séquentiel).</p>
      </div>
    </QuantPage>
  );
}