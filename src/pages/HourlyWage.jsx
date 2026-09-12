import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Clock } from 'lucide-react';
import { sum } from '@/lib/stats';

const wageStats = (trades) => {
  const withTimes = (trades || []).filter((t) => t.entry_time && t.exit_time && t.pnl != null);
  const hours = sum(withTimes.map((t) => (new Date(t.exit_time) - new Date(t.entry_time)) / 3600000));
  const pnl = sum(withTimes.map((t) => t.pnl || 0));
  const hourly = hours > 0 ? pnl / hours : 0;
  const buckets = Array(24).fill(0);
  (trades || []).forEach((t) => {
    if (t.entry_time) buckets[new Date(t.entry_time).getHours()] += t.pnl || 0;
  });
  return { hours, pnl, hourly, buckets: buckets.map((v, h) => ({ name: `${h}h`, value: Math.round(v) })), n: withTimes.length };
};

export default function HourlyWage() {
  return (
    <QuantPage
      title="Salaire Horaire"
      subtitle="Votre trading rapporte combien par heure réellement passée en position?"
      icon={Clock}
      metrics={(trades) => {
        const s = wageStats(trades);
        const best = s.buckets.reduce((a, b) => (b.value > a.value ? b : a), { name: '—', value: 0 });
        return [
          { label: 'Temps en position', value: `${s.hours.toFixed(1)} h`, sub: `${s.n} trades` },
          { label: 'PnL total', value: `${s.pnl >= 0 ? '+' : ''}${Math.round(s.pnl)}€`, color: s.pnl >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: '€/heure', value: `${s.hourly >= 0 ? '+' : ''}${s.hourly.toFixed(1)}€`, color: s.hourly >= 0 ? 'text-primary' : 'text-red-400' },
          { label: 'Meilleure heure', value: best.name, sub: `${best.value >= 0 ? '+' : ''}${best.value}€` },
        ];
      }}
      chartData={(trades) => wageStats(trades).buckets}
      chartType="bar"
      chartConfig={{ title: "PnL par heure d'entrée (€)", refLine: 0 }}
      aiPrompt="Analyse mon salaire horaire de trader et le PnL par heure d'entrée. Mes heures les plus rentables valent-elles le temps investi? Faut-il couper certaines plages horaires?"
      aiContext={(trades) => {
        const s = wageStats(trades);
        return `${s.hours.toFixed(1)}h en position, ${Math.round(s.pnl)}€, soit ${s.hourly.toFixed(1)}€/h. PnL par heure: ${s.buckets.map((b) => `${b.name}:${b.value}`).join(', ')}`;
      }}
    />
  );
}