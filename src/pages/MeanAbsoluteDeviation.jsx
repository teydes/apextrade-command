import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Sigma } from 'lucide-react';

export default function MeanAbsoluteDeviation() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'MAD', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const mad = pnls.reduce((s, p) => s + Math.abs(p - mean), 0) / n;
    const median = (() => { const s = [...pnls].sort((a, b) => a - b); return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; })();
    const medAD = pnls.reduce((s, p) => s + Math.abs(p - median), 0) / n;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1));
    const ratioMADStd = std > 0 ? mad / std : 0;
    const robust = ratioMADStd > 0.8 ? 'Oui (peu d\'outliers)' : 'Non (outliers présents)';
    return [
      { label: 'MAD', value: mad.toFixed(2), color: 'text-foreground' },
      { label: 'Median AD', value: medAD.toFixed(2), color: 'text-foreground' },
      { label: 'MAD/σ ratio', value: ratioMADStd.toFixed(3), color: ratioMADStd > 0.8 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Robuste', value: robust, color: ratioMADStd > 0.8 ? 'text-primary' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const median = (() => { const s = [...pnls].sort((a, b) => a - b); return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; })();
    return [
      { name: 'Moyenne', value: mean },
      { name: 'Médiane', value: median },
      { name: 'MAD', value: pnls.reduce((s, p) => s + Math.abs(p - mean), 0) / n },
      { name: 'MedianAD', value: pnls.reduce((s, p) => s + Math.abs(p - median), 0) / n },
    ];
  };

  return (
    <QuantPage
      title="Mean Absolute Deviation"
      subtitle="Dispersion robuste: MAD vs écart-type (détection d'outliers)"
      icon={Sigma}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Mesures robustes de tendance et dispersion' }}
      aiPrompt="Analyse la MAD (Mean Absolute Deviation). La MAD est une mesure de dispersion plus robuste que l'écart-type: elle n'amplifie pas les outliers. Un ratio MAD/σ proche de 0.8 (valeur normale) = distribution sans outliers significatifs. Un ratio très bas = la volatilité est dominée par quelques trades extrêmes: le Sharpe est trompeur, utilisez des métriques robustes."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">MAD</strong> = Σ|Xᵢ − mean| / n — robuste aux valeurs extrêmes</p>
        <p>Pour une distribution normale, MAD/σ ≈ 0.798. En dessous: présence d'outliers.</p>
      </div>
    </QuantPage>
  );
}