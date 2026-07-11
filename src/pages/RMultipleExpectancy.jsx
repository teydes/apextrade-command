import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Target } from 'lucide-react';

export default function RMultipleExpectancy() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && t.risk_reward != null);
    if (closed.length < 5) return [{ label: 'R-Expectancy', value: 'N/A' }];
    const rMultiples = closed.map(t => {
      const risk = Math.abs(t.entry_price - (t.stop_loss || t.entry_price));
      return risk > 0 ? (t.pnl || 0) / risk : 0;
    });
    const n = rMultiples.length;
    const meanR = rMultiples.reduce((a, b) => a + b, 0) / n;
    const stdR = Math.sqrt(rMultiples.reduce((s, r) => s + Math.pow(r - meanR, 2), 0) / (n - 1));
    const sqn = stdR > 0 ? Math.sqrt(n) * meanR / stdR : 0;
    const wins = rMultiples.filter(r => r > 0).length;
    const winRate = wins / n;
    const avgWinR = (() => {
      const w = rMultiples.filter(r => r > 0);
      return w.length > 0 ? w.reduce((a, b) => a + b, 0) / w.length : 0;
    })();
    const avgLossR = (() => {
      const l = rMultiples.filter(r => r < 0);
      return l.length > 0 ? Math.abs(l.reduce((a, b) => a + b, 0) / l.length) : 0;
    })();
    return [
      { label: 'R-Expectancy', value: meanR.toFixed(3) + 'R', color: meanR > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'SQN (R)', value: sqn.toFixed(3), color: sqn > 1.5 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Avg Win', value: avgWinR.toFixed(2) + 'R', color: 'text-primary' },
      { label: 'Avg Loss', value: avgLossR.toFixed(2) + 'R', color: 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && t.risk_reward != null);
    return closed.slice(-40).map((t, i) => {
      const risk = Math.abs(t.entry_price - (t.stop_loss || t.entry_price));
      const r = risk > 0 ? (t.pnl || 0) / risk : 0;
      return { name: `T${i + 1}`, value: r };
    });
  };

  return (
    <QuantPage
      title="R-Multiple Expectancy"
      subtitle="Expectancy exprimée en multiples de risque (R) — Van Tharp"
      icon={Target}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'R-Multiples par trade', refLine: 0 }}
      aiPrompt="Analyse l'expectancy en R. Une R-expectancy > 0.3R = excellente (on gagne 0.3R par trade en moyenne). Le SQN en R est la métrique de Van Tharp: > 1.5 = bon système, > 2.0 = excellent. L'avg win R et avg loss R montrent la qualité du R:R réalisé vs planifié."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed' && t.risk_reward != null).slice(-30).map(t => ({ pnl: t.pnl, entry: t.entry_price, sl: t.stop_loss, rr: t.risk_reward, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">R-Multiple</strong> = PnL / Risque (|entry − SL|)</p>
        <p><strong className="text-foreground">R-Expectancy</strong> = moyenne des R-multiples — indépendante du capital</p>
      </div>
    </QuantPage>
  );
}