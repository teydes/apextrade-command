import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { GitMerge } from 'lucide-react';

export default function CorrelationStability() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const bySymbol = {};
    for (const t of closed) {
      const s = t.symbol || 'UNKNOWN';
      if (!bySymbol[s]) bySymbol[s] = [];
      bySymbol[s].push(t.pnl);
    }
    const symbols = Object.entries(bySymbol).filter(([_, a]) => a.length >= 4).map(([s]) => s);
    if (symbols.length < 2) return [{ label: 'Corr. Stability', value: 'N/A — besoin de 2+ symboles' }];
    const corr = (a, b) => {
      const m = Math.min(a.length, b.length);
      const A = a.slice(0, m), B = b.slice(0, m);
      const ma = A.reduce((x, y) => x + y, 0) / m;
      const mb = B.reduce((x, y) => x + y, 0) / m;
      let num = 0, da = 0, db = 0;
      for (let i = 0; i < m; i++) { num += (A[i] - ma) * (B[i] - mb); da += Math.pow(A[i] - ma, 2); db += Math.pow(B[i] - mb, 2); }
      return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
    };
    const pairs = [];
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const a = bySymbol[symbols[i]], b = bySymbol[symbols[j]];
        const half = Math.floor(Math.min(a.length, b.length) / 2);
        const c1 = corr(a.slice(0, half), b.slice(0, half));
        const c2 = corr(a.slice(-half), b.slice(-half));
        pairs.push({ pair: `${symbols[i]}-${symbols[j]}`, c1, c2, drift: Math.abs(c2 - c1) });
      }
    }
    const avgDrift = pairs.reduce((s, p) => s + p.drift, 0) / pairs.length;
    const stablePct = pairs.filter(p => p.drift < 0.3).length / pairs.length * 100;
    const avgCorr = pairs.reduce((s, p) => s + (p.c1 + p.c2) / 2, 0) / pairs.length;
    return [
      { label: 'Stability', value: stablePct.toFixed(0) + '%', color: stablePct > 60 ? 'text-primary' : 'text-red-400' },
      { label: 'Avg Drift', value: avgDrift.toFixed(3), color: avgDrift < 0.3 ? 'text-primary' : 'text-red-400' },
      { label: 'Avg Corr', value: avgCorr.toFixed(3), color: Math.abs(avgCorr) < 0.5 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Paires', value: pairs.length.toString(), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const bySymbol = {};
    for (const t of closed) {
      const s = t.symbol || 'UNKNOWN';
      if (!bySymbol[s]) bySymbol[s] = [];
      bySymbol[s].push(t.pnl);
    }
    const symbols = Object.entries(bySymbol).filter(([_, a]) => a.length >= 4).map(([s]) => s);
    if (symbols.length < 2) return [];
    const corr = (a, b) => {
      const m = Math.min(a.length, b.length);
      const A = a.slice(0, m), B = b.slice(0, m);
      const ma = A.reduce((x, y) => x + y, 0) / m;
      const mb = B.reduce((x, y) => x + y, 0) / m;
      let num = 0, da = 0, db = 0;
      for (let i = 0; i < m; i++) { num += (A[i] - ma) * (B[i] - mb); da += Math.pow(A[i] - ma, 2); db += Math.pow(B[i] - mb, 2); }
      return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
    };
    const result = [];
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const a = bySymbol[symbols[i]], b = bySymbol[symbols[j]];
        const half = Math.floor(Math.min(a.length, b.length) / 2);
        result.push({
          name: `${symbols[i].slice(0, 6)}/${symbols[j].slice(0, 6)}`,
          H1: corr(a.slice(0, half), b.slice(0, half)),
          H2: corr(a.slice(-half), b.slice(-half)),
        });
      }
    }
    return result.slice(0, 12);
  };

  return (
    <QuantPage
      title="Correlation Stability"
      subtitle="Les corrélations entre symboles sont-elles stables dans le temps?"
      icon={GitMerge}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Corrélation 1ère vs 2ème moitié', refLine: 0 }}
      aiPrompt="Analyse la stabilité des corrélations. Compare la corrélation des PnL entre chaque paire de symboles sur la 1ère vs la 2ème moitié. Un drift important = les corrélations changent = la diversification observée hier peut ne pas protéger demain. Les corrélations tendent vers 1 en temps de crise: une stabilité faible impose de réduire l'exposition simultanée."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-60).map(t => ({ pnl: t.pnl, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Drift</strong> = |corr(2ème moitié) − corr(1ère moitié)| par paire</p>
        <p>Les corrélations instables rendent la diversification théorique trompeuse.</p>
      </div>
    </QuantPage>
  );
}