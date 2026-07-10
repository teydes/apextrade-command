import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Sigma } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function InformationRatio() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 2) return [{ label: 'Info Ratio', value: 'N/A', color: 'text-muted-foreground' }];
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const benchmark = 0;
    const excess = pnls.map(p => p - benchmark);
    const trackingErr = Math.sqrt(excess.reduce((s, e) => s + e * e, 0) / (excess.length - 1));
    const ir = trackingErr !== 0 ? (mean - benchmark) / trackingErr : 0;
    const annualized = ir * Math.sqrt(252);
    return [
      { label: 'Information Ratio', value: ir.toFixed(3), color: ir > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Annualized IR', value: annualized.toFixed(3), color: annualized > 0.5 ? 'text-primary' : 'text-muted-foreground' },
      { label: 'Tracking Error', value: trackingErr.toFixed(2), color: 'text-foreground' },
      { label: 'Excess Return', value: mean.toFixed(2), color: mean >= 0 ? 'text-primary' : 'text-red-400' },
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
      title="Information Ratio"
      subtitle="Ratio de rendement excédentaire vs erreur de suivi (benchmark = 0)"
      icon={Sigma}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'Courbe de rendement excédentaire cumulé' }}
      dataKey="value"
      aiPrompt="Analyse l'Information Ratio de ces trades. Un IR > 0.5 est bon, > 1.0 est excellent. Évalue la capacité à générer de l'alpha au-dessus du benchmark. Identifie les périodes de sous-performance."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-30).map(t => ({ pnl: t.pnl, symbol: t.symbol, date: t.entry_time })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Information Ratio</strong> = (Rendement moyen − Benchmark) / Erreur de suivi</p>
        <p>Contrairement au Sharpe, l'IR mesure la capacité à battre un benchmark (ici 0 = pas de gain), pas juste le ratio rendement/volatilité absolu.</p>
      </div>
    </QuantPage>
  );
}