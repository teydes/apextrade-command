import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { BarChart2 } from 'lucide-react';

export default function KolmogorovSmirnovTest() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl).sort((a, b) => a - b);
    if (pnls.length < 8) return [{ label: 'KS Test', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1));
    const erf = (x) => {
      const t = 1 / (1 + 0.3275911 * Math.abs(x));
      const y = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-x * x);
      return x >= 0 ? y : -y;
    };
    const normCDF = (x) => 0.5 * (1 + erf((x - mean) / (std * Math.SQRT2)));
    let dStat = 0;
    for (let i = 0; i < n; i++) {
      const nCDF = normCDF(pnls[i]);
      dStat = Math.max(dStat, Math.abs((i + 1) / n - nCDF), Math.abs(i / n - nCDF));
    }
    const critical = 1.36 / Math.sqrt(n);
    const isNormal = dStat < critical;
    return [
      { label: 'KS Statistic', value: dStat.toFixed(3), color: isNormal ? 'text-primary' : 'text-yellow-400' },
      { label: 'Critical (5%)', value: critical.toFixed(3), color: 'text-foreground' },
      { label: 'Normalité', value: isNormal ? 'Acceptée' : 'Rejetée', color: isNormal ? 'text-primary' : 'text-red-400' },
      { label: 'Échantillon', value: n.toString(), color: n > 50 ? 'text-primary' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl).sort((a, b) => a - b);
    if (pnls.length < 8) return [];
    const n = pnls.length;
    const min = Math.min(...pnls), max = Math.max(...pnls);
    const range = max - min || 1;
    const bins = 20;
    const counts = new Array(bins).fill(0);
    for (const p of pnls) {
      const idx = Math.min(Math.floor(((p - min) / range) * bins), bins - 1);
      counts[idx]++;
    }
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1));
    return counts.map((c, i) => {
      const x = min + (range / bins) * (i + 0.5);
      const expected = std > 0 ? n * (range / bins) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2)) / (std * Math.sqrt(2 * Math.PI)) : 0;
      return { name: x.toFixed(0), Empirique: c, Normale: expected.toFixed(1) };
    });
  };

  return (
    <QuantPage
      title="Kolmogorov-Smirnov Test"
      subtitle="Test non-paramétrique de normalité de la distribution des PnL"
      icon={BarChart2}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Distribution empirique vs normale' }}
      aiPrompt="Analyse le test de Kolmogorov-Smirnov. Le KS compare la CDF empirique des PnL à la CDF normale. Si la statistique D dépasse le seuil critique (1.36/√n), la distribution n'est pas normale: les métriques paramétriques (VaR, Sharpe) doivent être interprétées avec prudence, préférer des mesures robustes."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">D</strong> = max |F(x) − F_normale(x)| — distance CDF maximale</p>
        <p>Seuil critique au niveau 5%: 1.36 / √n. Non-paramétrique, adapté aux petits échantillons.</p>
      </div>
    </QuantPage>
  );
}