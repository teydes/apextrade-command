import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { AlertTriangle } from 'lucide-react';

export default function ConcentrationRisk() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 3) return [{ label: 'Concentration', value: 'N/A' }];
    const bySymbol = {};
    for (const t of closed) {
      const s = t.symbol || 'UNKNOWN';
      bySymbol[s] = (bySymbol[s] || 0) + Math.abs(t.pnl || 0);
    }
    const total = Object.values(bySymbol).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(bySymbol).sort((a, b) => b[1] - a[1]);
    const top1 = sorted[0];
    const top1Pct = total > 0 ? (top1[1] / total) * 100 : 0;
    const top3Pct = sorted.slice(0, 3).reduce((s, [, v]) => s + v, 0) / total * 100;
    const hhi = Object.values(bySymbol).reduce((s, v) => s + Math.pow(v / total, 2), 0);
    const effectiveN = 1 / hhi;
    return [
      { label: 'Top Symbol %', value: top1Pct.toFixed(0) + '%', color: top1Pct < 40 ? 'text-primary' : 'text-red-400' },
      { label: 'Top 3 %', value: top3Pct.toFixed(0) + '%', color: top3Pct < 70 ? 'text-primary' : 'text-yellow-400' },
      { label: 'HHI Index', value: hhi.toFixed(3), color: hhi < 0.25 ? 'text-primary' : 'text-red-400' },
      { label: 'Effective N', value: effectiveN.toFixed(1), color: effectiveN > 3 ? 'text-primary' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const bySymbol = {};
    for (const t of closed) {
      const s = t.symbol || 'UNKNOWN';
      bySymbol[s] = (bySymbol[s] || 0) + Math.abs(t.pnl || 0);
    }
    const total = Object.values(bySymbol).reduce((a, b) => a + b, 0);
    return Object.entries(bySymbol)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sym, val]) => ({ name: sym, value: total > 0 ? (val / total) * 100 : 0 }));
  };

  return (
    <QuantPage
      title="Concentration Risk Index"
      subtitle="Diversification: HHI, concentration par symbole, effective N"
      icon={AlertTriangle}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Concentration par symbole (%)' }}
      aiPrompt="Analyse le risque de concentration. Top symbol > 40% = sur-concentration dangereuse. HHI > 0.25 = portefeuille concentré. Effective N < 3 = pas assez diversifié. Recommande de répartir le risque sur plus de symboles pour réduire le risque idiosyncratique."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">HHI</strong> = Σ(part²) — Herfindahl-Hirschman Index</p>
        <p><strong className="text-foreground">Effective N</strong> = 1/HHI — nombre équivalent de positions équipondérées</p>
      </div>
    </QuantPage>
  );
}