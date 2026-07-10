import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Shield } from 'lucide-react';

export default function DeflatedSharpe() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 10) return [{ label: 'DSR', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const variance = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1);
    const std = Math.sqrt(variance);
    const sharpe = std > 0 ? mean / std : 0;
    const skew = (() => {
      const s3 = pnls.reduce((s, p) => s + Math.pow(p - mean, 3), 0) / n;
      return std > 0 ? s3 / Math.pow(std, 3) : 0;
    })();
    const kurt = (() => {
      const s4 = pnls.reduce((s, p) => s + Math.pow(p - mean, 4), 0) / n;
      return std > 0 ? s4 / Math.pow(std, 4) - 3 : 0;
    })();
    // Estimation of the expected max Sharpe from N independent strategies (proxy: variance of trades)
    const expectedMaxSharpe = Math.sqrt(2 * Math.log(Math.max(n, 2)));
    const deflationFactor = Math.sqrt(1 - (expectedMaxSharpe * expectedMaxSharpe) / Math.max(n * 252, 1));
    const dsr = sharpe * deflationFactor;
    const dsrAnnual = dsr * Math.sqrt(252);
    return [
      { label: 'Deflated Sharpe', value: dsr.toFixed(3), color: dsr > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Sharpe brut', value: sharpe.toFixed(3), color: sharpe > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'DSR Annualized', value: dsrAnnual.toFixed(3), color: dsrAnnual > 1 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Deflation %', value: (deflationFactor * 100).toFixed(0) + '%', color: deflationFactor > 0.8 ? 'text-primary' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0;
    return closed.slice(-50).map((t, i) => {
      cumul += t.pnl || 0;
      return { name: `T${i + 1}`, value: cumul };
    });
  };

  return (
    <QuantPage
      title="Deflated Sharpe Ratio"
      subtitle="Sharpe ajusté pour selection bias et multiple testing"
      icon={Shield}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity Curve' }}
      aiPrompt="Analyse le Deflated Sharpe Ratio (DSR). Le DSR corrige le Sharpe pour le biais de sélection (multiple testing). Si on teste N stratégies, la meilleure aura un Sharpe gonflé artificiellement. DSR < Sharpe brut, et DSR > 0 = stratégie réellement profitable."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">DSR</strong> = Sharpe × facteur de déflation (ajuste pour selection bias)</p>
        <p>Le DSR corrige l'inflation du Sharpe due au test de multiples stratégies/paramètres.</p>
      </div>
    </QuantPage>
  );
}