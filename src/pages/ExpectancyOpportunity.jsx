import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Sigma } from 'lucide-react';

export default function ExpectancyOpportunity() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 3) return [{ label: 'Expectunity', value: 'N/A' }];
    const pnls = closed.map(t => t.pnl);
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / Math.max(n - 1, 1));
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 1;
    const winRate = wins.length / n;
    const rExpectancy = winRate * avgWin - (1 - winRate) * avgLoss;
    const opportunitiesPerMonth = n / Math.max(closed.length / 3, 1);
    const expectunity = mean * Math.min(opportunitiesPerMonth, n);
    const sqn = std > 0 ? Math.sqrt(n) * mean / std : 0;
    return [
      { label: 'Expectunity', value: expectunity.toFixed(2), color: expectunity > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Expectancy', value: mean.toFixed(2), color: mean >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Opportunities', value: n.toString(), color: 'text-foreground' },
      { label: 'R-Expectancy', value: rExpectancy.toFixed(2), color: rExpectancy >= 0 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0;
    return closed.slice(-50).map((t, i) => {
      cumul += t.pnl || 0;
      return { name: `T${i + 1}`, value: cumul };
    });
  };

  return (
    <QuantPage
      title="Expectancy × Opportunity (Expectunity)"
      subtitle="Van Tharp: Expectancy multipliée par le nombre d'opportunités"
      icon={Sigma}
      metrics={metrics}
      chartData={chartData}
      chartType="area"
      chartConfig={{ title: 'Cumul des opportunités' }}
      aiPrompt="Analyse l'Expectunity de Van Tharp. Une stratégie avec une expectancy élevée mais peu d'opportunités peut être moins rentable qu'une stratégie avec une expectancy modérée mais beaucoup d'opportunités. L'expectunity combine ces deux dimensions. Une bonne stratégie maximise le produit des deux."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, symbol: t.symbol, strategy: t.strategy })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Expectunity</strong> = Expectancy × Nombre d'opportunités</p>
        <p>Une stratégie peu fréquente doit avoir une expectancy très élevée pour rivaliser.</p>
      </div>
    </QuantPage>
  );
}