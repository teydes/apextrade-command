import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Star } from 'lucide-react';

export default function AlphaCalculator() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 3) return [{ label: 'Alpha', value: 'N/A' }];
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 1;
    const winRate = wins.length / pnls.length;
    const expectedR = winRate * avgWin - (1 - winRate) * avgLoss;
    const benchmark = 0;
    const alpha = mean - benchmark;
    const alphaPct = expectedR > 0 ? (alpha / expectedR) * 100 : 0;
    return [
      { label: 'Alpha (absolu)', value: alpha.toFixed(2), color: alpha > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Alpha %', value: alphaPct.toFixed(1) + '%', color: alpha > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Rendement moyen', value: mean.toFixed(2), color: mean >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'E[R] Kelly', value: expectedR.toFixed(2), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0;
    return closed.slice(-50).map((t, i) => {
      cumul += t.pnl || 0;
      return { name: `T${i + 1}`, value: cumul, benchmark: 0 };
    });
  };

  return (
    <QuantPage
      title="Alpha Calculator"
      subtitle="Rendement excédentaire vs benchmark (0 = capital sans risque)"
      icon={Star}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Alpha cumulé (excédent vs benchmark)', refLine: 0 }}
      aiPrompt="Analyse l'Alpha. L'alpha représente le rendement excédentaire généré par la stratégie vs un benchmark. Un alpha positif et croissant = compétence. Évalue si l'alpha vient du timing, de la sélection, ou du risk management."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, symbol: t.symbol, strategy: t.strategy })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Alpha</strong> = Rendement stratégie − Rendement benchmark</p>
        <p>L'alpha mesure la valeur ajoutée par le trader au-delà du mouvement de marché. Un alpha positif régulier = compétence.</p>
      </div>
    </QuantPage>
  );
}