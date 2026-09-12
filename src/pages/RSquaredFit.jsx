import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { LineChart } from 'lucide-react';

export default function RSquaredFit() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'R²', value: 'N/A' }];
    const n = closed.length;
    let cumul = 0;
    const equity = closed.map(t => { cumul += t.pnl || 0; return cumul; });
    const x = equity.map((_, i) => i + 1);
    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = equity.reduce((a, b) => a + b, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      num += (x[i] - mx) * (equity[i] - my);
      denX += Math.pow(x[i] - mx, 2);
      denY += Math.pow(equity[i] - my, 2);
    }
    const r = denX > 0 && denY > 0 ? num / Math.sqrt(denX * denY) : 0;
    const r2 = r * r;
    const slope = denX > 0 ? num / denX : 0;
    const quality = r2 > 0.9 ? 'Excellente' : r2 > 0.7 ? 'Bonne' : r2 > 0.4 ? 'Moyenne' : 'Faible';
    return [
      { label: 'R²', value: r2.toFixed(4), color: r2 > 0.7 ? 'text-primary' : r2 > 0.4 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'Qualité', value: quality, color: r2 > 0.7 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Pente', value: slope.toFixed(2), color: slope >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Corrélation', value: r.toFixed(3), color: r > 0 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0;
    return closed.slice(-60).map((t, i) => {
      cumul += t.pnl || 0;
      return { name: `T${i + 1}`, Equity: cumul };
    });
  };

  return (
    <QuantPage
      title="R² — Equity Curve Linearity"
      subtitle="Goodness of fit: la courbe d'equity suit-elle une droite?"
      icon={LineChart}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Equity curve vs régression linéaire' }}
      dataKey="Equity"
      aiPrompt="Analyse le R² de la courbe d'equity. Un R² proche de 1 = croissance parfaitement linéaire, signe d'une stratégie très stable et prévisible. Un R² faible = croissance erratique avec beaucoup de bruit. Le K-Ratio et le R² sont complémentaires: R² mesure la linéarité, la pente mesure la vitesse de croissance. Visez un R² supérieur à 0.7."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">R²</strong> = (corrélation equity/temps)² — variance expliquée par la tendance</p>
        <p>Une equity linéaire = rendement prévisible; une equity erratique = risque réel élevé.</p>
      </div>
    </QuantPage>
  );
}