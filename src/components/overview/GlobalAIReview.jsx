import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2 } from 'lucide-react';

// Analyse IA du portefeuille entier: risque cumulé, consistance, objectifs, recommandations
export default function GlobalAIReview({ stats, totalEquity, dailyPnl }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const run = async () => {
    setLoading(true);
    try {
      const summary = stats.map(({ account, s }) =>
        `${account.name} (${account.propfirm || account.broker || '—'}): solde ${Math.round(account.current_balance || 0)}€, PnL jour ${Math.round(s.dailyPnl)}€, PnL total ${Math.round(s.totalPnl)}€, DD jour ${s.dailyUsedPct.toFixed(0)}%, DD max ${s.ddUsedPct.toFixed(0)}%, objectif ${s.targetPct.toFixed(0)}%, consistance ${s.consistencyPct.toFixed(1)}% (règle ${account.consistency_rule || 0}%)`
      ).join('\n');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es un coach de trading professionnel spécialisé prop-firm. Analyse ce portefeuille multi-comptes:\nEquity totale: ${Math.round(totalEquity)}€, PnL du jour: ${Math.round(dailyPnl)}€.\n${summary}\n\nÉvalue le risque cumulé, le respect des règles de consistance, la progression vers les objectifs, et donne des recommandations concrètes priorisées pour la suite de la journée.`,
        response_json_schema: { type: 'object', properties: { analysis: { type: 'string' }, score: { type: 'number' }, recommendations: { type: 'array', items: { type: 'string' } }, risk_level: { type: 'string' } } }
      });
      setAnalysis(res);
    } catch (e) { setAnalysis({ analysis: 'Erreur lors de l\'analyse IA.' }); }
    setLoading(false);
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground"><Sparkles className="w-4 h-4 text-primary" />Analyse IA du portefeuille</div>
          <Button onClick={run} disabled={loading} size="sm">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}Analyser
          </Button>
        </div>
        {analysis && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs">
              {analysis.score != null && <span className="font-mono font-bold text-primary">Score: {analysis.score}/100</span>}
              {analysis.risk_level && <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${analysis.risk_level === 'low' ? 'bg-green-500/20 text-green-400' : analysis.risk_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{String(analysis.risk_level).toUpperCase()}</span>}
            </div>
            <div className="text-xs text-muted-foreground whitespace-pre-wrap">{analysis.analysis}</div>
            {analysis.recommendations?.length > 0 && (
              <div className="space-y-1">
                {analysis.recommendations.map((r, i) => (
                  <div key={i} className="text-xs text-muted-foreground flex gap-2"><span className="text-primary">→</span>{r}</div>
                ))}
              </div>
            )}
          </div>
        )}
        {!analysis && !loading && <div className="text-[10px] text-muted-foreground">Lancez une analyse pour obtenir une évaluation globale du risque, de la consistance et des objectifs de tous vos comptes.</div>}
      </CardContent>
    </Card>
  );
}