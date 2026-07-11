import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Sigma } from 'lucide-react';

export default function SQNAnalyzer() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'SQN', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1));
    const sqn = std > 0 ? Math.sqrt(n) * mean / std : 0;
    const rating = sqn > 3.0 ? 'Excellent' : sqn > 2.0 ? 'Bon' : sqn > 1.0 ? 'Moyen' : sqn > 0.5 ? 'Faible' : 'Mauvais';
    return [
      { label: 'SQN', value: sqn.toFixed(3), color: sqn > 2 ? 'text-primary' : sqn > 1 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'Rating', value: rating, color: sqn > 2 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Expectancy', value: mean.toFixed(2), color: mean >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Std Dev', value: std.toFixed(2), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [];
    let cumul = 0;
    return pnls.slice(-50).map((p, i) => {
      cumul += p;
      const slice = pnls.slice(0, i + 1);
      const m = slice.reduce((a, b) => a + b, 0) / slice.length;
      const s = slice.length > 1 ? Math.sqrt(slice.reduce((su, v) => su + Math.pow(v - m, 2), 0) / (slice.length - 1)) : 0;
      return { name: `T${i + 1}`, value: s > 0 ? Math.sqrt(slice.length) * m / s : 0 };
    });
  };

  return (
    <QuantPage
      title="System Quality Number (SQN)"
      subtitle="Score de qualité système de Van Tharp: √n × E[R] / σ"
      icon={Sigma}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'SQN évolution', refLine: 1.0 }}
      aiPrompt="Analyse le SQN de Van Tharp. SQN > 3.0 = système excellent. 2.0-3.0 = bon. 1.6-2.0 = moyen mais échangeable. 1.0-1.6 = faible. < 1.0 = mauvais. Le SQN combine l'expectancy, la variabilité et la taille d'échantillon. Un SQN élevé avec peu de trades peut être trompeur."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">SQN</strong> = √(n) × Expectancy / Std Dev</p>
        <p>Le SQN de Van Tharp est l'un des indicateurs les plus fiables pour évaluer un système de trading.</p>
      </div>
    </QuantPage>
  );
}