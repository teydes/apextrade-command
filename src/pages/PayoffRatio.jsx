import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Scale } from 'lucide-react';
import { mean } from '@/lib/stats';

const payoffStats = (trades) => {
  const cl = (trades || []).filter((t) => t.result === 'win' || t.result === 'loss');
  const wins = cl.filter((t) => t.result === 'win').map((t) => t.pnl || 0);
  const losses = cl.filter((t) => t.result === 'loss').map((t) => Math.abs(t.pnl || 0));
  const aw = mean(wins), al = mean(losses);
  const payoff = al > 0 ? aw / al : 0;
  const breakevenWr = payoff > 0 ? 1 / (1 + payoff) : 0;
  const wr = cl.length ? (wins.length / cl.length) * 100 : 0;
  const expectancy = (wr / 100) * aw - (1 - wr / 100) * al;
  return { aw, al, payoff, breakevenWr, wr, expectancy, n: cl.length };
};

export default function PayoffRatio() {
  return (
    <QuantPage
      title="Payoff Ratio"
      subtitle="Gain moyen / perte moyenne — et le win rate d'équilibre qui en découle"
      icon={Scale}
      metrics={(trades) => {
        const s = payoffStats(trades);
        return [
          { label: 'Payoff Ratio', value: s.payoff.toFixed(2), color: s.payoff >= 1.5 ? 'text-green-400' : 'text-yellow-400' },
          { label: 'Gain moyen', value: `+${Math.round(s.aw)}€`, color: 'text-green-400' },
          { label: 'Perte moyenne', value: `-${Math.round(s.al)}€`, color: 'text-red-400' },
          { label: 'WR d\'équilibre', value: `${(s.breakevenWr * 100).toFixed(1)}%`, sub: `votre WR: ${s.wr.toFixed(1)}%`, color: s.wr > s.breakevenWr * 100 ? 'text-green-400' : 'text-red-400' },
        ];
      }}
      chartData={(trades) => {
        const s = payoffStats(trades);
        return [
          { name: 'Gain moyen', value: Math.round(s.aw) },
          { name: 'Perte moyenne', value: Math.round(s.al) },
          { name: 'Espérance', value: Math.round(s.expectancy) },
        ];
      }}
      chartType="bar"
      chartConfig={{ title: 'Gains vs Pertes (€)' }}
      aiPrompt="Analyse mon payoff ratio au regard de mon win rate réel. Mon edge est-il structurellement solide? Dois-je travailler le ratio ou le win rate pour maximiser l'espérance?"
      aiContext={(trades) => {
        const s = payoffStats(trades);
        return `Payoff=${s.payoff.toFixed(2)}, WR=${s.wr.toFixed(1)}% vs équilibre=${(s.breakevenWr * 100).toFixed(1)}%, espérance=${Math.round(s.expectancy)}€/trade sur ${s.n} trades`;
      }}
    />
  );
}