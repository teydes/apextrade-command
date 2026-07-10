import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function CumulativeDelta() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 3) return [{ label: 'Delta', value: 'N/A' }];
    const longs = closed.filter(t => t.direction === 'LONG');
    const shorts = closed.filter(t => t.direction === 'SHORT');
    const longVol = longs.reduce((s, t) => s + (t.lot_size || t.quantity || 0), 0);
    const shortVol = shorts.reduce((s, t) => s + (t.lot_size || t.quantity || 0), 0);
    const cumDelta = longVol - shortVol;
    const totalVol = longVol + shortVol;
    const deltaPct = totalVol > 0 ? (cumDelta / totalVol) * 100 : 0;
    return [
      { label: 'Cum Delta', value: cumDelta.toFixed(2), color: cumDelta >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Delta %', value: deltaPct.toFixed(1) + '%', color: Math.abs(deltaPct) < 20 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Long Vol', value: longVol.toFixed(2), color: 'text-foreground' },
      { label: 'Short Vol', value: shortVol.toFixed(2), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumDelta = 0;
    return closed.slice(-50).map((t, i) => {
      const vol = t.lot_size || t.quantity || 0;
      cumDelta += t.direction === 'LONG' ? vol : -vol;
      return { name: `T${i + 1}`, value: cumDelta };
    });
  };

  return (
    <QuantPage
      title="Cumulative Delta"
      subtitle="Pression acheteuse vs vendeuse (order flow directionnel)"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="area"
      chartConfig={{ title: 'Cumulative Delta (volume directionnel)', refLine: 0 }}
      aiPrompt="Analyse le Cumulative Delta. Un delta positif croissant = pression acheteuse dominante. Un delta négatif = pression vendeuse. Un delta proche de zéro = marché équilibré. Compare avec le PnL pour voir si le trader suit le flux."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, direction: t.direction, volume: t.lot_size || t.quantity })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Cumulative Delta</strong> = Σ(Volume Long) − Σ(Volume Short)</p>
        <p>Le delta mesure la pression directionnelle nette du flux d'ordres.</p>
      </div>
    </QuantPage>
  );
}