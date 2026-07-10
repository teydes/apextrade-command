import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { CalendarClock } from 'lucide-react';

export default function TradeLatencyAnalysis() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.entry_time && t.exit_time);
    if (closed.length < 3) return [{ label: 'Latency', value: 'N/A' }];
    const durations = closed.map(t => {
      const entry = new Date(t.entry_time).getTime();
      const exit = new Date(t.exit_time).getTime();
      return (exit - entry) / (1000 * 60);
    });
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDur = Math.min(...durations);
    const maxDur = Math.max(...durations);
    const median = durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)];
    const hours = avgDuration / 60;
    return [
      { label: 'Durée moyenne', value: hours > 1 ? `${hours.toFixed(1)}h` : `${avgDuration.toFixed(0)}min`, color: 'text-primary' },
      { label: 'Médiane', value: median > 60 ? `${(median / 60).toFixed(1)}h` : `${median.toFixed(0)}min`, color: 'text-foreground' },
      { label: 'Min', value: `${minDur.toFixed(0)}min`, color: 'text-foreground' },
      { label: 'Max', value: maxDur > 1440 ? `${(maxDur / 1440).toFixed(1)}j` : `${(maxDur / 60).toFixed(1)}h`, color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.entry_time && t.exit_time);
    return closed.slice(-50).map((t, i) => {
      const dur = (new Date(t.exit_time).getTime() - new Date(t.entry_time).getTime()) / (1000 * 60);
      return { name: `T${i + 1}`, value: dur / 60 };
    });
  };

  return (
    <QuantPage
      title="Trade Latency Analysis"
      subtitle="Analyse de la durée de détention des positions"
      icon={CalendarClock}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Durée par trade (heures)' }}
      aiPrompt="Analyse la latence des trades. La durée moyenne de détention révèle le style: scalping (< 1h), day trading (1-8h), swing (jours). Une durée courte avec un bon PnL = scalping efficace. Une durée longue avec drawdown = positions bloquées. Évalue si la durée optimale existe."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed' && t.entry_time).slice(-30).map(t => ({ pnl: t.pnl, entry: t.entry_time, exit: t.exit_time, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Trade Latency</strong>: temps de détention en minutes/heures</p>
        <p>La durée optimale dépend du style de trading et de la volatilité du marché.</p>
      </div>
    </QuantPage>
  );
}