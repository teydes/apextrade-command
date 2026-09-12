import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Undo2 } from 'lucide-react';
import { sortByTime, sum } from '@/lib/stats';

const ddStats = (trades) => {
  const sorted = sortByTime(trades).filter((t) => typeof t.pnl === 'number');
  let eq = 0, peak = 0, dd = 0;
  sorted.forEach((t) => {
    eq += t.pnl;
    if (eq > peak) peak = eq;
    dd = Math.max(dd, peak - eq);
  });
  const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
  const recovery = ddPct < 100 ? (1 / (1 - ddPct / 100) - 1) * 100 : 100;
  return { dd, ddPct, recovery, peak, total: sum(sorted.map((t) => t.pnl)), n: sorted.length };
};

export default function RecoveryRequired() {
  return (
    <QuantPage
      title="Recovery Requis"
      subtitle="Gain nécessaire pour revenir au plus haut après un drawdown"
      icon={Undo2}
      metrics={(trades) => {
        const s = ddStats(trades);
        return [
          { label: 'Drawdown actuel/max', value: `${s.ddPct.toFixed(1)}%`, color: s.ddPct < 10 ? 'text-green-400' : 'text-red-400' },
          { label: 'Gain requis', value: `+${s.recovery.toFixed(1)}%`, sub: 'pour revenir au peak' },
          { label: 'Peak equity', value: `${Math.round(s.peak)}€` },
          { label: 'PnL net', value: `${s.total >= 0 ? '+' : ''}${Math.round(s.total)}€`, color: s.total >= 0 ? 'text-green-400' : 'text-red-400' },
        ];
      }}
      chartData={() => {
        const pts = [];
        for (let d = 5; d <= 50; d += 5) pts.push({ name: `-${d}%`, value: +((1 / (1 - d / 100) - 1) * 100).toFixed(1) });
        return pts;
      }}
      chartType="bar"
      chartConfig={{ title: 'Gain requis pour récupérer un drawdown (%)', refLine: 100 }}
      extraStats={() => (
        <div className="text-xs text-muted-foreground space-y-2">
          <p><strong className="text-foreground">Asymétrie des pertes</strong>: -20% exige +25%, -50% exige +100%.</p>
          <p>C'est pourquoi le contrôle du drawdown prime sur la maximisation du rendement — un drawdown profond devient mathématiquement quasi irrécupérable.</p>
        </div>
      )}
      aiPrompt="Analyse mon drawdown maximal et le recovery requis associé. Mon drawdown est-il dans une zone récupérable? Recommandations pour limiter mathématiquement la profondeur des pertes."
      aiContext={(trades) => {
        const s = ddStats(trades);
        return `DD max=${s.ddPct.toFixed(1)}% (${Math.round(s.dd)}€), recovery requis=${s.recovery.toFixed(1)}%, peak=${Math.round(s.peak)}€ sur ${s.n} trades`;
      }}
    />
  );
}