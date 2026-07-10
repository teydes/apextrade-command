import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { AlertCircle } from 'lucide-react';

export default function OutlierAnalysis() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'Outliers', value: 'N/A' }];
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (pnls.length - 1));
    const threshold = 2 * std;
    const outliers = closed.filter(t => Math.abs((t.pnl || 0) - mean) > threshold);
    const positiveOutliers = outliers.filter(t => t.pnl > mean);
    const negativeOutliers = outliers.filter(t => t.pnl < mean);
    const outlierImpact = outliers.reduce((s, t) => s + (t.pnl || 0), 0);
    const totalPnl = pnls.reduce((a, b) => a + b, 0);
    const impactPct = totalPnl !== 0 ? (outlierImpact / totalPnl) * 100 : 0;
    return [
      { label: 'Outliers', value: outliers.length.toString(), color: outliers.length > 5 ? 'text-yellow-400' : 'text-foreground' },
      { label: 'Positive', value: positiveOutliers.length.toString(), color: 'text-primary' },
      { label: 'Negative', value: negativeOutliers.length.toString(), color: 'text-red-400' },
      { label: 'Impact %', value: impactPct.toFixed(0) + '%', color: Math.abs(impactPct) > 50 ? 'text-yellow-400' : 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [];
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (pnls.length - 1));
    return closed.slice(-50).map((t, i) => ({
      name: `T${i + 1}`,
      value: t.pnl || 0,
      isOutlier: Math.abs((t.pnl || 0) - mean) > 2 * std,
    }));
  };

  return (
    <QuantPage
      title="Outlier Analysis"
      subtitle="Détection des trades atypiques (> 2σ de la moyenne)"
      icon={AlertCircle}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Trades et outliers (>2σ)', refLine: 0 }}
      aiPrompt="Analyse les outliers. Les trades à plus de 2 écarts-types de la moyenne ont un impact disproportionné. Si les outliers positifs dominent, la stratégie dépend de quelques gros gains (fragile). Si négatifs, il y a des pertes extrêmes à contrôler. Le % d'impact montre la dépendance aux outliers."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, symbol: t.symbol, strategy: t.strategy })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Outlier</strong> = trade dont le PnL s'écarte de plus de 2σ de la moyenne</p>
        <p>Une forte dépendance aux outliers = stratégie fragile. Un impact &lt; 30% = robuste.</p>
      </div>
    </QuantPage>
  );
}