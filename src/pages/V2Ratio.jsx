import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Gauge } from 'lucide-react';

export default function V2Ratio() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 10) return [{ label: 'V2 Ratio', value: 'N/A' }];
    const n = pnls.length;
    const totalReturn = pnls.reduce((a, b) => a + b, 0);
    const mean = totalReturn / n;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1));
    let cumul = 0, peak = 0, maxDD = 0;
    for (const p of pnls) { cumul += p; if (cumul > peak) peak = cumul; const dd = peak - cumul; if (dd > maxDD) maxDD = dd; }
    const ddPenalty = 1 + (maxDD / Math.max(Math.abs(peak), 1));
    const denom = std * Math.sqrt(n) * ddPenalty;
    const v2 = denom > 0 ? totalReturn / denom : 0;
    const v2Annual = v2 * Math.sqrt(252 / Math.max(n, 1));
    const grade = v2 > 1 ? 'Excellent' : v2 > 0.5 ? 'Bon' : v2 > 0 ? 'Faible' : 'Négatif';
    return [
      { label: 'V2 Ratio', value: v2.toFixed(3), color: v2 > 0.5 ? 'text-primary' : v2 > 0 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'V2 Annualisé', value: v2Annual.toFixed(3), color: v2Annual > 1 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Grade', value: grade, color: v2 > 0.5 ? 'text-primary' : 'text-yellow-400' },
      { label: 'DD Penalty', value: ddPenalty.toFixed(2) + 'x', color: ddPenalty < 1.5 ? 'text-primary' : 'text-red-400' },
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
      title="V2 Ratio"
      subtitle="Ratio de Favero: rendement ajusté volatilité avec pénalité de drawdown"
      icon={Gauge}
      metrics={metrics}
      chartData={chartData}
      chartType="area"
      chartConfig={{ title: 'Equity curve' }}
      aiPrompt="Analyse le V2 Ratio de Favero-Burghardt. Le V2 améliore le Sharpe: il divise le rendement par la volatilité pénalisée par le drawdown maximal. Deux stratégies avec le même Sharpe peuvent avoir des V2 très différents si l'une a des drawdowns plus profonds. Un V2 supérieur à 0.5 est bon; le grade Excellent (supérieur à 1) est rare et valuable."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">V2</strong> = R_total / (σ × √n × (1 + DD/peak))</p>
        <p>Le V2 punit le drawdown que le Sharpe ignore: deux Sharpe égaux, deux risques différents.</p>
      </div>
    </QuantPage>
  );
}