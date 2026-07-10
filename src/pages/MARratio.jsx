import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { TrendingUp } from 'lucide-react';

export default function MARratio() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'MAR', value: 'N/A' }];
    let cumul = 0, peak = 0, maxDD = 0;
    for (const t of closed) {
      cumul += t.pnl || 0;
      if (cumul > peak) peak = cumul;
      const dd = peak - cumul;
      if (dd > maxDD) maxDD = dd;
    }
    const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
    const estimatedCapital = Math.max(Math.abs(totalPnl) * 5, 1000);
    const cagr = (totalPnl / estimatedCapital) * 100;
    const maxDDPct = estimatedCapital > 0 ? (maxDD / estimatedCapital) * 100 : 0;
    const mar = maxDDPct > 0 ? cagr / maxDDPct : 0;
    return [
      { label: 'MAR Ratio', value: mar.toFixed(2), color: mar > 1 ? 'text-primary' : mar > 0 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'CAGR %', value: cagr.toFixed(2) + '%', color: cagr > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Max DD %', value: maxDDPct.toFixed(2) + '%', color: 'text-red-400' },
      { label: 'PnL Total', value: totalPnl.toFixed(2), color: totalPnl >= 0 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0, peak = 0;
    return closed.slice(-60).map((t, i) => {
      cumul += t.pnl || 0;
      if (cumul > peak) peak = cumul;
      return { name: `T${i + 1}`, value: cumul, dd: peak - cumul };
    });
  };

  return (
    <QuantPage
      title="MAR Ratio"
      subtitle="CAGR / Maximum Drawdown (rendement ajusté au risque extrême)"
      icon={TrendingUp}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity & Drawdown' }}
      aiPrompt="Analyse le MAR Ratio. MAR > 1 est excellent (rendement annuel > max drawdown). MAR < 0.5 = médiocre. Le MAR est l'une des mesures les plus exigeantes car il utilise le pire drawdown observé."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">MAR Ratio</strong> = CAGR / Max Drawdown %</p>
        <p>Le MAR est une mesure stricte: rendement annuel divisé par le pire drawdown historique.</p>
      </div>
    </QuantPage>
  );
}