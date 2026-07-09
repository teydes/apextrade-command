import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Clock } from 'lucide-react';

export default function DrawdownDuration() {
  const metrics = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    let peak = 0, cumSum = 0, ddStart = null, maxDDDuration = 0, currentDDDuration = 0, ddCount = 0;
    pnls.forEach((p, i) => {
      cumSum += p;
      if (cumSum >= peak) { peak = cumSum; if (ddStart !== null) { maxDDDuration = Math.max(maxDDDuration, i - ddStart); ddStart = null; } currentDDDuration = 0; }
      else { if (ddStart === null) { ddStart = i; ddCount++; } currentDDDuration = i - ddStart; }
    });
    if (ddStart !== null) maxDDDuration = Math.max(maxDDDuration, pnls.length - ddStart);
    const avgDuration = ddCount ? maxDDDuration / ddCount : 0;
    return [
      { label: 'Max DD Duration', value: `${maxDDDuration} trades`, color: 'text-destructive' },
      { label: 'Current DD Duration', value: `${currentDDDuration} trades`, color: currentDDDuration > 0 ? 'text-yellow-400' : 'text-primary' },
      { label: 'DD Count', value: ddCount, color: 'text-blue-400' },
      { label: 'Avg DD Duration', value: `${avgDuration.toFixed(0)} trades`, color: 'text-muted-foreground' },
    ];
  };

  const chartData = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    let peak = 0, cumSum = 0;
    return pnls.map((p, i) => { cumSum += p; peak = Math.max(peak, cumSum); return { name: `T${i+1}`, value: cumSum - peak }; });
  };

  const aiPrompt = "Analyse la durée des drawdowns. Évalue combien de temps il faut pour récupérer d'un drawdown en moyenne. Identifie les drawdowns prolongés et recommande des stratégies pour réduire la durée de recovery.";

  return (
    <QuantPage
      title="Drawdown Duration"
      subtitle="Durée des drawdowns, temps de recovery"
      icon={Clock}
      metrics={metrics}
      chartData={chartData}
      chartType="area"
      chartConfig={{ title: 'Underwater Curve (Drawdown Duration)' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify({ pnls: trades.filter(t=>t.pnl!=null).map(t=>t.pnl) })}
    />
  );
}