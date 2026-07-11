import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Brain } from 'lucide-react';

export default function ShannonEntropy() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'Entropy', value: 'N/A' }];
    const wins = closed.filter(t => t.pnl > 0).length;
    const losses = closed.filter(t => t.pnl < 0).length;
    const be = closed.filter(t => t.pnl === 0).length;
    const n = closed.length;
    const pWin = wins / n, pLoss = losses / n, pBE = be / n;
    let entropy = 0;
    if (pWin > 0) entropy -= pWin * Math.log2(pWin);
    if (pLoss > 0) entropy -= pLoss * Math.log2(pLoss);
    if (pBE > 0) entropy -= pBE * Math.log2(pBE);
    const maxEntropy = Math.log2(3);
    const normalized = (entropy / maxEntropy) * 100;
    const predictability = 100 - normalized;
    return [
      { label: 'Shannon Entropy', value: entropy.toFixed(3) + ' bits', color: 'text-foreground' },
      { label: 'Normalized', value: normalized.toFixed(0) + '%', color: normalized > 80 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Predictability', value: predictability.toFixed(0) + '%', color: predictability > 50 ? 'text-yellow-400' : 'text-primary' },
      { label: 'States', value: `W:${wins} L:${losses} BE:${be}`, color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [];
    return [
      { name: 'Wins', value: closed.filter(t => t.pnl > 0).length },
      { name: 'Losses', value: closed.filter(t => t.pnl < 0).length },
      { name: 'Break Even', value: closed.filter(t => t.pnl === 0).length },
    ];
  };

  return (
    <QuantPage
      title="Shannon Entropy"
      subtitle="Entropie informationnelle: prévisibilité des outcomes"
      icon={Brain}
      metrics={metrics}
      chartData={chartData}
      chartType="pie"
      chartConfig={{ title: 'Distribution des outcomes' }}
      aiPrompt="Analyse l'entropie de Shannon. Une entropie maximale (= log₂(3) ≈ 1.585) = distribution parfaitement équilibrée (imprévisible). Une entropie faible = distribution déséquilibrée (prévisible). Une stratégie avec une entropie très faible (ex: 90% de wins) peut sembler bonne mais être fragile. Une entropie élevée indique un edge réel mais subtil."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl > 0 ? 'W' : t.pnl < 0 ? 'L' : 'BE' })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">H</strong> = −Σ pᵢ × log₂(pᵢ) — entropie de Shannon</p>
        <p>Une entropie élevée = outcomes imprévisibles (edge subtil); faible = pattern exploitable mais potentiellement fragile.</p>
      </div>
    </QuantPage>
  );
}