import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Scale } from 'lucide-react';

export default function TailRatioPage() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl).sort((a, b) => a - b);
    if (pnls.length < 10) return [{ label: 'Tail Ratio', value: 'N/A' }];
    const q95 = pnls[Math.floor(pnls.length * 0.95)];
    const q5 = pnls[Math.floor(pnls.length * 0.05)];
    const tailRatio = Math.abs(q5) > 0 ? Math.abs(q95) / Math.abs(q5) : 0;
    const commonSense = (() => {
      const grossWin = pnls.filter(p => p > 0).reduce((a, b) => a + b, 0);
      const grossLoss = Math.abs(pnls.filter(p => p < 0).reduce((a, b) => a + b, 0));
      const pf = grossLoss > 0 ? grossWin / grossLoss : 0;
      return pf * tailRatio;
    })();
    return [
      { label: 'Tail Ratio', value: tailRatio.toFixed(3), color: tailRatio > 1 ? 'text-primary' : 'text-red-400' },
      { label: 'Common Sense', value: commonSense.toFixed(3), color: commonSense > 1 ? 'text-primary' : 'text-red-400' },
      { label: 'P95 (gain)', value: q95.toFixed(2), color: 'text-primary' },
      { label: 'P5 (perte)', value: q5.toFixed(2), color: 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl).sort((a, b) => a - b);
    if (pnls.length < 10) return [];
    const percentiles = [5, 10, 25, 50, 75, 90, 95];
    return percentiles.map(p => ({ name: `P${p}`, value: pnls[Math.floor(pnls.length * (p / 100))] }));
  };

  return (
    <QuantPage
      title="Tail Ratio & Common Sense"
      subtitle="Ratio des gains extrêmes vs pertes extrêmes (queues de distribution)"
      icon={Scale}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Percentiles des PnL', refLine: 0 }}
      aiPrompt="Analyse le Tail Ratio et Common Sense Ratio. Tail Ratio > 1 = les gains extrêmes dépassent les pertes extrêmes (bon). Common Sense Ratio = Profit Factor × Tail Ratio, combinant fréquence et amplitude. Un CSR > 1 = stratégie globalement saine."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Tail Ratio</strong> = |P95| / |P5| (gains extrêmes vs pertes extrêmes)</p>
        <p><strong className="text-foreground">Common Sense Ratio</strong> = Profit Factor × Tail Ratio</p>
      </div>
    </QuantPage>
  );
}