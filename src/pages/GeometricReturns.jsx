import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { TrendingUp } from 'lucide-react';

export default function GeometricReturns() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'Geo Returns', value: 'N/A' }];
    const totalPnl = pnls.reduce((a, b) => a + b, 0);
    const estimatedCapital = Math.max(Math.abs(totalPnl) * 5, 1000);
    const n = pnls.length;
    const arithmeticMean = totalPnl / n;
    let geoProduct = 1;
    for (const p of pnls) {
      const ret = 1 + (p / estimatedCapital);
      geoProduct *= ret;
    }
    const geoMean = Math.pow(geoProduct, 1 / n) - 1;
    const geoTotal = geoMean * n * estimatedCapital;
    const gap = arithmeticMean - (geoMean * estimatedCapital);
    const volDrag = arithmeticMean > 0 ? (gap / arithmeticMean) * 100 : 0;
    return [
      { label: 'Arithmetic Mean', value: arithmeticMean.toFixed(2), color: arithmeticMean >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Geometric Mean', value: (geoMean * estimatedCapital).toFixed(2), color: geoMean >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Vol Drag %', value: volDrag.toFixed(1) + '%', color: volDrag < 20 ? 'text-primary' : 'text-red-400' },
      { label: 'Geo Total', value: geoTotal.toFixed(2), color: geoTotal >= 0 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let arithCumul = 0, geoCumul = 1;
    const cap = Math.max(Math.abs(closed.reduce((s, t) => s + (t.pnl || 0), 0)) * 5, 1000);
    return closed.slice(-40).map((t, i) => {
      arithCumul += t.pnl || 0;
      geoCumul *= (1 + (t.pnl || 0) / cap);
      return { name: `T${i + 1}`, Arithmetic: arithCumul, Geometric: (geoCumul - 1) * cap };
    });
  };

  return (
    <QuantPage
      title="Geometric vs Arithmetic Returns"
      subtitle="Écart entre rendements géométriques et arithmétiques (volatility drag)"
      icon={TrendingUp}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Arithmetic vs Geometric' }}
      dataKey="Arithmetic"
      aiPrompt="Analyse l'écart géométrique vs arithmétique. Le rendement géométrique (composé) est toujours inférieur à l'arithmétique à cause du volatility drag. Un vol drag > 20% signifie que la volatilité détruit 20% du rendement théorique. Réduire la volatilité améliore le rendement composé."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Geometric Mean</strong> = (∏(1+Rᵢ))^(1/n) − 1</p>
        <p><strong className="text-foreground">Vol Drag</strong> = Arithmetic − Geometric (perte due à la volatilité)</p>
      </div>
    </QuantPage>
  );
}