import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Clock } from 'lucide-react';

export default function HourlyPerformance() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && t.entry_time);
    if (closed.length < 3) return [{ label: 'Hourly', value: 'N/A' }];
    const byHour = {};
    for (const t of closed) {
      const h = new Date(t.entry_time).getHours();
      if (!byHour[h]) byHour[h] = { pnl: 0, count: 0, wins: 0 };
      byHour[h].pnl += t.pnl || 0;
      byHour[h].count++;
      if ((t.pnl || 0) > 0) byHour[h].wins++;
    }
    const hours = Object.entries(byHour).map(([h, d]) => ({
      hour: parseInt(h), pnl: d.pnl, count: d.count, wr: d.wins / d.count
    })).sort((a, b) => b.pnl - a.pnl);
    const best = hours[0];
    const worst = hours[hours.length - 1];
    return [
      { label: 'Best Hour', value: `${best.hour}h`, color: 'text-primary' },
      { label: 'Best PnL', value: best.pnl.toFixed(2), color: 'text-primary' },
      { label: 'Worst Hour', value: `${worst.hour}h`, color: 'text-red-400' },
      { label: 'Worst PnL', value: worst.pnl.toFixed(2), color: 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && t.entry_time);
    const byHour = {};
    for (const t of closed) {
      const h = new Date(t.entry_time).getHours();
      byHour[h] = (byHour[h] || 0) + (t.pnl || 0);
    }
    return Array.from({ length: 24 }, (_, h) => ({ name: `${h}h`, value: byHour[h] || 0 }));
  };

  return (
    <QuantPage
      title="Hourly Performance"
      subtitle="Performance par heure d'entrée (timing optimal)"
      icon={Clock}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'PnL par heure de la journée', refLine: 0 }}
      aiPrompt="Analyse la performance par heure. Identifie les heures golden (meilleur PnL) et les heures à éviter (PnL négatif). Suggère de concentrer le trading sur les meilleures heures et d'éviter les pires. Corrèle avec les sessions de marché (London, NY, Asia)."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed' && t.entry_time).slice(-40).map(t => ({ pnl: t.pnl, hour: new Date(t.entry_time).getHours(), symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Hourly Performance</strong>: PnL agrégé par heure d'entrée</p>
        <p>Identifie les fenêtres temporelles optimales pour entrer en position.</p>
      </div>
    </QuantPage>
  );
}