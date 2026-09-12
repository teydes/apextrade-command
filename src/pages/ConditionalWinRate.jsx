import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Repeat } from 'lucide-react';
import { sortByTime } from '@/lib/stats';

const condStats = (trades) => {
  const seq = sortByTime(trades).filter((t) => t.result === 'win' || t.result === 'loss').map((t) => t.result);
  const wr = (arr) => (arr.length ? (arr.filter((r) => r === 'win').length / arr.length) * 100 : 0);
  const afterWin = wr(seq.slice(1).filter((_, i) => seq[i] === 'win'));
  const afterLoss = wr(seq.slice(1).filter((_, i) => seq[i] === 'loss'));
  return { global: wr(seq), afterWin, afterLoss, n: seq.length };
};

export default function ConditionalWinRate() {
  return (
    <QuantPage
      title="Win Rate Conditionnel"
      subtitle="Taux de réussite après une victoire vs après une perte — détection de tilt/momentum"
      icon={Repeat}
      metrics={(trades) => {
        const s = condStats(trades);
        const gap = s.afterWin - s.afterLoss;
        return [
          { label: 'WR global', value: `${s.global.toFixed(1)}%` },
          { label: 'WR après gain', value: `${s.afterWin.toFixed(1)}%`, color: 'text-green-400' },
          { label: 'WR après perte', value: `${s.afterLoss.toFixed(1)}%`, color: 'text-red-400' },
          { label: 'Écart', value: `${gap >= 0 ? '+' : ''}${gap.toFixed(1)} pts`, sub: Math.abs(gap) > 10 ? 'Biais émotionnel probable' : 'Équilibré', color: Math.abs(gap) > 10 ? 'text-yellow-400' : 'text-green-400' },
        ];
      }}
      chartData={(trades) => {
        const s = condStats(trades);
        return [
          { name: 'Global', value: +s.global.toFixed(1) },
          { name: 'Après gain', value: +s.afterWin.toFixed(1) },
          { name: 'Après perte', value: +s.afterLoss.toFixed(1) },
        ];
      }}
      chartType="bar"
      chartConfig={{ title: 'Win rate conditionnel (%)', refLine: 50 }}
      aiPrompt="Analyse mon win rate conditionnel. Un WR plus faible après une perte suggère du tilt ou du revenge trading; un WR plus élevé après un gain peut indiquer de la confiance positive. Que conseilles-tu?"
      aiContext={(trades) => {
        const s = condStats(trades);
        return `WR global=${s.global.toFixed(1)}%, après gain=${s.afterWin.toFixed(1)}%, après perte=${s.afterLoss.toFixed(1)}% (${s.n} trades)`;
      }}
    />
  );
}