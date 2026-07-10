import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Layers } from 'lucide-react';

export default function MarketRegimeDetection() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 15) return [{ label: 'Regime', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const variance = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1);
    const std = Math.sqrt(variance);
    const window = 10;
    const recentSlice = pnls.slice(-window);
    const recentMean = recentSlice.reduce((a, b) => a + b, 0) / window;
    const recentVar = recentSlice.reduce((s, p) => s + Math.pow(p - recentMean, 2), 0) / (window - 1);
    const recentStd = Math.sqrt(recentVar);
    const zScore = std > 0 ? (recentMean - mean) / (std / Math.sqrt(window)) : 0;
    const volRatio = std > 0 ? recentStd / std : 1;
    let regime;
    if (zScore > 1.5 && volRatio < 1.3) regime = 'Bull Calme';
    else if (zScore > 1.5 && volRatio >= 1.3) regime = 'Bull Volatile';
    else if (zScore < -1.5 && volRatio < 1.3) regime = 'Bear Calme';
    else if (zScore < -1.5 && volRatio >= 1.3) regime = 'Bear Volatile';
    else if (volRatio > 1.5) regime = 'Transition/Choppy';
    else regime = 'Neutre';
    return [
      { label: 'Régime actuel', value: regime, color: regime.includes('Bull') ? 'text-primary' : regime.includes('Bear') ? 'text-red-400' : 'text-yellow-400' },
      { label: 'Z-Score', value: zScore.toFixed(2), color: Math.abs(zScore) < 1 ? 'text-foreground' : zScore > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Vol Ratio', value: volRatio.toFixed(2), color: volRatio < 1.2 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Recent Mean', value: recentMean.toFixed(2), color: recentMean > 0 ? 'text-primary' : 'text-red-400' },
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
      title="Market Regime Detection"
      subtitle="Détection automatique du régime de marché actuel"
      icon={Layers}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity Curve par régime' }}
      aiPrompt="Analyse le régime de marché détecté. Le Z-Score compare la performance récente à la moyenne historique. Le vol ratio compare la volatilité récente à l'historique. Bull = performance au-dessus de la norme, Bear = en-dessous. Un régime volatile ou choppy nécessite plus de prudence."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-30).map(t => ({ pnl: t.pnl, symbol: t.symbol, date: t.entry_time })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Régime</strong> déterminé par Z-Score (performance) et Vol Ratio (volatilité)</p>
        <p>Bull/Bear × Calme/Volatile = 4 régimes principaux + Transition.</p>
      </div>
    </QuantPage>
  );
}