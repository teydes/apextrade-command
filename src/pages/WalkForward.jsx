import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { GitBranch } from 'lucide-react';

export default function WalkForward() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 10) return [{ label: 'WFA', value: 'N/A' }];
    const trainSize = Math.floor(closed.length * 0.6);
    const train = closed.slice(0, trainSize);
    const test = closed.slice(trainSize);
    const trainPnl = train.reduce((s, t) => s + (t.pnl || 0), 0);
    const testPnl = test.reduce((s, t) => s + (t.pnl || 0), 0);
    const trainWR = train.filter(t => t.pnl > 0).length / train.length;
    const testWR = test.filter(t => t.pnl > 0).length / test.length;
    const degradation = trainWR > 0 ? ((trainWR - testWR) / trainWR) * 100 : 0;
    const trainAvg = trainPnl / train.length;
    const testAvg = testPnl / test.length;
    const efficiency = trainAvg !== 0 ? (testAvg / trainAvg) * 100 : 0;
    return [
      { label: 'Train WR', value: (trainWR * 100).toFixed(1) + '%', color: 'text-primary' },
      { label: 'Test WR', value: (testWR * 100).toFixed(1) + '%', color: testWR > 0.4 ? 'text-primary' : 'text-red-400' },
      { label: 'Dégradation', value: degradation.toFixed(1) + '%', color: degradation < 15 ? 'text-primary' : degradation < 30 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'OOS Efficacité', value: efficiency.toFixed(0) + '%', color: efficiency > 60 ? 'text-primary' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 10) return [];
    const trainSize = Math.floor(closed.length * 0.6);
    let cumul = 0;
    return closed.map((t, i) => {
      cumul += t.pnl || 0;
      return { name: `T${i + 1}`, value: cumul, phase: i < trainSize ? 'train' : 'test' };
    });
  };

  return (
    <QuantPage
      title="Walk-Forward Analysis"
      subtitle="Validation out-of-sample: train 60% / test 40%"
      icon={GitBranch}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity Curve (In-Sample vs Out-of-Sample)' }}
      aiPrompt="Analyse le Walk-Forward. La dégradation entre train et test indique le niveau d'overfitting. < 15% = robuste, 15-30% = acceptable, > 30% = overfitting. Évalue si la stratégie généralise en conditions réelles."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Walk-Forward</strong>: Split 60% train / 40% test</p>
        <p>La dégradation de performance entre in-sample et out-of-sample révèle l'overfitting.</p>
      </div>
    </QuantPage>
  );
}