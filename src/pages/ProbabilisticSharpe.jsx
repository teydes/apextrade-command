import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Percent } from 'lucide-react';

export default function ProbabilisticSharpe() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'PSR', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const variance = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1);
    const std = Math.sqrt(variance);
    const skew = (() => {
      const s3 = pnls.reduce((s, p) => s + Math.pow(p - mean, 3), 0) / n;
      return s3 / Math.pow(std, 3);
    })();
    const kurt = (() => {
      const s4 = pnls.reduce((s, p) => s + Math.pow(p - mean, 4), 0) / n;
      return s4 / Math.pow(std, 4) - 3;
    })();
    const sharpe = std > 0 ? mean / std : 0;
    const sharpeRef = 0;
    const psr = (() => {
      const z = ((sharpe - sharpeRef) * Math.sqrt(n - 1)) / Math.sqrt(1 - skew * sharpe + ((kurt - 1) / 4) * sharpe * sharpe);
      const normCdf = (z) => 0.5 * (1 + erf(z / Math.sqrt(2)));
      function erf(x) { const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911; const sign=x<0?-1:1; x=Math.abs(x); const t=1/(1+p*x); const y=1-((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x); return sign*y; }
      return normCdf(z);
    })();
    return [
      { label: 'PSR (95% target)', value: (psr * 100).toFixed(1) + '%', color: psr > 0.95 ? 'text-primary' : psr > 0.8 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'Sharpe observé', value: sharpe.toFixed(3), color: sharpe > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Skewness', value: skew.toFixed(3), color: skew < 0 ? 'text-red-400' : 'text-primary' },
      { label: 'Kurtosis excès', value: kurt.toFixed(3), color: kurt > 3 ? 'text-red-400' : 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [];
    const buckets = [-Infinity, -100, -50, -25, 0, 25, 50, 100, Infinity];
    const labels = ['<-100', '-100/-50', '-50/-25', '-25/0', '0/25', '25/50', '50/100', '>100'];
    const counts = new Array(8).fill(0);
    for (const p of pnls) {
      for (let i = 0; i < buckets.length - 1; i++) {
        if (p >= buckets[i] && p < buckets[i + 1]) { counts[i]++; break; }
      }
    }
    return labels.map((l, i) => ({ name: l, value: counts[i] }));
  };

  return (
    <QuantPage
      title="Probabilistic Sharpe Ratio"
      subtitle="Sharpe ajusté pour skewness, kurtosis et taille d'échantillon"
      icon={Percent}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Distribution des PnL' }}
      aiPrompt="Analyse le Probabilistic Sharpe Ratio (PSR). Le PSR donne la probabilité que le Sharpe observé soit supérieur à un benchmark (0). PSR > 95% = confiance élevée. Le PSR corrige le biais du Sharpe lié aux distributions non-normales."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">PSR</strong> = Φ(Z) où Z ajuste le Sharpe pour skewness, kurtosis et n</p>
        <p>Le Sharpe classique assume une distribution normale. Le PSR corrige ce biais et donne une probabilité de confiance.</p>
      </div>
    </QuantPage>
  );
}