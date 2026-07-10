import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { TrendingUp } from 'lucide-react';

export default function RachevRatio() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl).sort((a, b) => a - b);
    if (pnls.length < 10) return [{ label: 'Rachev', value: 'N/A' }];
    const n = pnls.length;
    const tailSize = Math.max(Math.floor(n * 0.05), 1);
    const worstTail = pnls.slice(0, tailSize);
    const bestTail = pnls.slice(-tailSize);
    const avgWorst = worstTail.reduce((a, b) => a + b, 0) / tailSize;
    const avgBest = bestTail.reduce((a, b) => a + b, 0) / tailSize;
    const rachev = Math.abs(avgWorst) > 0 ? avgBest / Math.abs(avgWorst) : 0;
    const upside = avgBest;
    const downside = Math.abs(avgWorst);
    return [
      { label: 'Rachev Ratio', value: rachev.toFixed(3), color: rachev > 1 ? 'text-primary' : 'text-red-400' },
      { label: 'E[Tail Gain]', value: upside.toFixed(2), color: 'text-primary' },
      { label: 'E[Tail Loss]', value: downside.toFixed(2), color: 'text-red-400' },
      { label: 'Asymétrie', value: rachev > 1.2 ? 'Positive' : rachev < 0.8 ? 'Négative' : 'Neutre', color: rachev > 1.2 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl).sort((a, b) => a - b);
    if (pnls.length < 10) return [];
    const tailSize = Math.max(Math.floor(pnls.length * 0.1), 2);
    return [
      { name: 'Worst 5%', value: pnls.slice(0, tailSize).reduce((a, b) => a + b, 0) / tailSize },
      { name: 'Best 5%', value: pnls.slice(-tailSize).reduce((a, b) => a + b, 0) / tailSize },
    ];
  };

  return (
    <QuantPage
      title="Rachev Ratio"
      subtitle="Espérance des gains extrêmes / espérance des pertes extrêmes"
      icon={TrendingUp}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Tails de distribution', refLine: 0 }}
      aiPrompt="Analyse le Rachev Ratio. C'est une mesure de risque de queue qui compare l'espérance des gains extrêmes (best 5%) à l'espérance des pertes extrêmes (worst 5%). Rachev > 1 = la stratégie a plus de upside que de downside dans les queues."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Rachev Ratio</strong> = E[gains au-delà P95] / E[pertes sous P5]</p>
        <p>Le Rachev est insensible aux mouvements centraux et se concentre uniquement sur les queues.</p>
      </div>
    </QuantPage>
  );
}