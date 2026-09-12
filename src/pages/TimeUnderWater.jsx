import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Waves } from 'lucide-react';
import { sortByTime, sum } from '@/lib/stats';

const tuwStats = (trades) => {
  const sorted = sortByTime(trades).filter((t) => typeof t.pnl === 'number');
  let eq = 0, peak = 0;
  const pts = [];
  let underwater = 0, streak = 0, maxStreak = 0;
  sorted.forEach((t, i) => {
    eq += t.pnl;
    if (eq > peak) { peak = eq; streak = 0; } else { underwater++; streak++; maxStreak = Math.max(maxStreak, streak); }
    const ddPct = peak > 0 ? -(((peak - eq) / peak) * 100) : 0;
    pts.push({ name: `#${i + 1}`, value: +ddPct.toFixed(2) });
  });
  return {
    n: sorted.length,
    underwaterPct: sorted.length ? (underwater / sorted.length) * 100 : 0,
    maxStreak,
    totalPnl: sum(sorted.map((t) => t.pnl)),
    pts,
  };
};

export default function TimeUnderWater() {
  return (
    <QuantPage
      title="Time Under Water (TUW)"
      subtitle="Proportion du temps passé sous le dernier sommet d'equity"
      icon={Waves}
      metrics={(trades) => {
        const s = tuwStats(trades);
        return [
          { label: "Temps sous l'eau", value: `${s.underwaterPct.toFixed(1)}%`, color: s.underwaterPct < 40 ? 'text-green-400' : 'text-yellow-400' },
          { label: 'Plus longue période', value: `${s.maxStreak} trades`, sub: 'sous le plus haut' },
          { label: 'PnL total', value: `${s.totalPnl >= 0 ? '+' : ''}${Math.round(s.totalPnl)}€`, color: s.totalPnl >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: 'Trades analysés', value: s.n },
        ];
      }}
      chartData={(trades) => tuwStats(trades).pts.slice(-60)}
      chartType="area"
      chartConfig={{ title: 'Profondeur du drawdown dans le temps (%)' }}
      aiPrompt="Analyse mon Time Under Water: je passe trop de temps à récupérer des pertes? Que révèle la profondeur et la durée de mes périodes sous l'eau sur la qualité de mon edge et ma gestion psychologique?"
      aiContext={(trades) => {
        const s = tuwStats(trades);
        return `${s.underwaterPct.toFixed(1)}% du temps sous l'eau, plus longue période: ${s.maxStreak} trades, PnL total: ${Math.round(s.totalPnl)}€ sur ${s.n} trades`;
      }}
    />
  );
}