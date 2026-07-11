import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { GitCompare } from 'lucide-react';

export default function TrackingError() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'Tracking Error', value: 'N/A' }];
    const n = closed.length;
    const pnls = closed.map(t => t.pnl);
    const meanPnl = pnls.reduce((a, b) => a + b, 0) / n;
    const benchmarkReturn = 0;
    const excessReturns = pnls.map(p => p - benchmarkReturn);
    const trackingError = Math.sqrt(excessReturns.reduce((s, e) => s + e * e, 0) / n);
    const informationRatio = trackingError > 0 ? meanPnl / trackingError : 0;
    const totalExcess = excessReturns.reduce((s, e) => s + e, 0);
    const positiveExcess = excessReturns.filter(e => e > 0).length;
    const hitRate = (positiveExcess / n) * 100;
    return [
      { label: 'Tracking Error', value: trackingError.toFixed(2), color: trackingError < 50 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Info Ratio', value: informationRatio.toFixed(3), color: informationRatio > 0.5 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Excess Return', value: totalExcess.toFixed(2), color: totalExcess >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Hit Rate', value: hitRate.toFixed(0) + '%', color: hitRate > 55 ? 'text-primary' : 'text-red-400' },
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
      title="Tracking Error"
      subtitle="Écart-type des rendements excédentaires vs benchmark"
      icon={GitCompare}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Rendement excédentaire cumulé', refLine: 0 }}
      aiPrompt="Analyse le tracking error. Il mesure la volatilité de l'écart par rapport au benchmark (ici 0 = capital au repos). Un TE faible avec un excess return positif = stratégie qui bat le benchmark de façon stable. Un TE élevé = la performance varie beaucoup par rapport au benchmark. L'Information Ratio (excess return / TE) synthétise la qualité."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Tracking Error</strong> = √(Σ(Rᵢ − Benchmark)² / n)</p>
        <p>Un TE bas + un excess return positif = alpha stable et prévisible.</p>
      </div>
    </QuantPage>
  );
}