import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { ShieldAlert } from 'lucide-react';

export default function WorstCaseAnalysis() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'Worst Case', value: 'N/A' }];
    const sorted = [...pnls].sort((a, b) => a - b);
    const worst1 = sorted[0];
    const worst3 = sorted.slice(0, 3).reduce((a, b) => a + b, 0);
    const worst5 = sorted.slice(0, 5).reduce((a, b) => a + b, 0);
    const worst10 = sorted.slice(0, Math.min(10, sorted.length)).reduce((a, b) => a + b, 0);
    const totalPnl = pnls.reduce((a, b) => a + b, 0);
    const worst1Impact = totalPnl !== 0 ? (worst1 / totalPnl) * 100 : 0;
    const worst5Impact = totalPnl !== 0 ? (worst5 / totalPnl) * 100 : 0;
    return [
      { label: 'Worst Trade', value: worst1.toFixed(2), color: 'text-red-400' },
      { label: 'Worst 3 Σ', value: worst3.toFixed(2), color: 'text-red-400' },
      { label: 'Worst 5 Σ', value: worst5.toFixed(2), color: 'text-red-400' },
      { label: 'Worst 1 Impact', value: worst1Impact.toFixed(0) + '%', color: Math.abs(worst1Impact) > 50 ? 'text-red-400' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl).sort((a, b) => a - b);
    if (pnls.length < 5) return [];
    return [
      { name: 'Worst 1', value: pnls[0] },
      { name: 'Worst 3 avg', value: pnls.slice(0, 3).reduce((a, b) => a + b, 0) / 3 },
      { name: 'Worst 5 avg', value: pnls.slice(0, 5).reduce((a, b) => a + b, 0) / 5 },
      { name: 'Worst 10 avg', value: pnls.slice(0, Math.min(10, pnls.length)).reduce((a, b) => a + b, 0) / Math.min(10, pnls.length) },
      { name: 'Median', value: pnls[Math.floor(pnls.length / 2)] },
    ];
  };

  return (
    <QuantPage
      title="Worst Case Analysis"
      subtitle="Analyse des pires scénarios: impact des trades extrêmes"
      icon={ShieldAlert}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Pires trades et moyenne', refLine: 0 }}
      aiPrompt="Analyse le worst case. L'impact du worst trade sur le PnL total révèle la fragilité. Si le worst 1 représente > 50% du PnL, un seul trade peut détruire la performance. Le worst 5 vs la médiane montre l'asymétrie. Évalue si le trader survit à son pire scénario historique répété."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, symbol: t.symbol, strategy: t.strategy })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Worst Case</strong>: analyse des pires trades et de leur impact agrégé</p>
        <p>Si un seul trade peut détruire la performance, la stratégie est fragile.</p>
      </div>
    </QuantPage>
  );
}