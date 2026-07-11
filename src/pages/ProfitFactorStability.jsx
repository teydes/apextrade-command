import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function ProfitFactorStability() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 15) return [{ label: 'PF Stability', value: 'N/A' }];
    const window = 10;
    const pfs = [];
    for (let i = window; i <= pnls.length; i++) {
      const slice = pnls.slice(i - window, i);
      const grossWin = slice.filter(p => p > 0).reduce((a, b) => a + b, 0);
      const grossLoss = Math.abs(slice.filter(p => p < 0).reduce((a, b) => a + b, 0));
      pfs.push(grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 1);
    }
    const validPfs = pfs.filter(p => p < 99);
    if (validPfs.length === 0) return [{ label: 'PF Stability', value: 'N/A' }];
    const avg = validPfs.reduce((a, b) => a + b, 0) / validPfs.length;
    const min = Math.min(...validPfs);
    const max = Math.max(...validPfs);
    const stability = max > 0 ? (1 - (max - min) / max) * 100 : 0;
    const consistent = validPfs.filter(p => p > 1).length / validPfs.length * 100;
    return [
      { label: 'Avg PF', value: avg.toFixed(2), color: avg > 1.5 ? 'text-primary' : 'text-yellow-400' },
      { label: 'PF Stability', value: stability.toFixed(0) + '%', color: stability > 60 ? 'text-primary' : 'text-red-400' },
      { label: '% PF > 1', value: consistent.toFixed(0) + '%', color: consistent > 70 ? 'text-primary' : 'text-red-400' },
      { label: 'PF Range', value: `${min.toFixed(1)}-${max.toFixed(1)}`, color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 15) return [];
    const window = 10;
    const result = [];
    for (let i = window; i <= pnls.length; i++) {
      const slice = pnls.slice(i - window, i);
      const grossWin = slice.filter(p => p > 0).reduce((a, b) => a + b, 0);
      const grossLoss = Math.abs(slice.filter(p => p < 0).reduce((a, b) => a + b, 0));
      result.push({ name: `T${i}`, value: grossLoss > 0 ? grossWin / grossLoss : 2 });
    }
    return result;
  };

  return (
    <QuantPage
      title="Profit Factor Stability"
      subtitle="Stabilité temporelle du profit factor (fenêtre glissante)"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Profit Factor glissant (window=10)', refLine: 1 }}
      aiPrompt="Analyse la stabilité du profit factor. Un PF stable (stability > 60%) = stratégie fiable. Un PF qui oscille entre < 1 et > 3 = instable. Le % de périodes avec PF > 1 doit être > 70% pour valider la stratégie. Un PF moyen élevé avec une faible stabilité = trompeur."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">PF Stability</strong> = 1 − (max−min)/max × 100 sur fenêtre glissante</p>
        <p>Un PF stable dans le temps est plus valuable qu'un PF moyen élevé mais volatil.</p>
      </div>
    </QuantPage>
  );
}