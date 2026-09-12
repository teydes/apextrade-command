import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { CalendarRange } from 'lucide-react';
import { sum } from '@/lib/stats';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

const periodStats = (trades) => {
  const now = new Date();
  const sameY = (t) => new Date(t.entry_time || 0).getFullYear() === now.getFullYear();
  const inMonth = (t) => sameY(t) && new Date(t.entry_time).getMonth() === now.getMonth();
  const inQuarter = (t) => sameY(t) && Math.floor(new Date(t.entry_time).getMonth() / 3) === Math.floor(now.getMonth() / 3);
  const pnl = (f) => sum((trades || []).filter((t) => t.entry_time && f(t)).map((t) => t.pnl || 0));
  const mtd = pnl(inMonth), qtd = pnl(inQuarter), ytd = pnl(sameY);
  const buckets = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const v = sum((trades || []).filter((t) => {
      const td = new Date(t.entry_time || 0);
      return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
    }).map((t) => t.pnl || 0));
    buckets.push({ name: MONTHS[d.getMonth()], value: Math.round(v) });
  }
  return { mtd, qtd, ytd, buckets };
};

export default function PeriodReturns() {
  return (
    <QuantPage
      title="Rendements Périodiques"
      subtitle="MTD / QTD / YTD et PnL des 12 derniers mois"
      icon={CalendarRange}
      metrics={(trades) => {
        const s = periodStats(trades);
        const col = (v) => (v >= 0 ? 'text-green-400' : 'text-red-400');
        return [
          { label: 'MTD', value: `${s.mtd >= 0 ? '+' : ''}${Math.round(s.mtd)}€`, color: col(s.mtd) },
          { label: 'QTD', value: `${s.qtd >= 0 ? '+' : ''}${Math.round(s.qtd)}€`, color: col(s.qtd) },
          { label: 'YTD', value: `${s.ytd >= 0 ? '+' : ''}${Math.round(s.ytd)}€`, color: col(s.ytd) },
          { label: 'Moyenne mensuelle', value: `${Math.round(sum(s.buckets.map((b) => b.value)) / 12)}€` },
        ];
      }}
      chartData={(trades) => periodStats(trades).buckets}
      chartType="bar"
      chartConfig={{ title: 'PnL mensuel — 12 derniers mois (€)', refLine: 0 }}
      aiPrompt="Analyse mes rendements MTD, QTD, YTD et l'évolution mensuelle. Quelle est la tendance? Consistance des mois positifs? Recommandations pour stabiliser la courbe."
      aiContext={(trades) => {
        const s = periodStats(trades);
        return `MTD=${Math.round(s.mtd)}€, QTD=${Math.round(s.qtd)}€, YTD=${Math.round(s.ytd)}€, 12 mois: ${s.buckets.map((b) => b.value).join(', ')}`;
      }}
    />
  );
}