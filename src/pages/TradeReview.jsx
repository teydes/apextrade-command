import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, TrendingUp, TrendingDown, Brain, Download, Eye, Edit3, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function TradeReview() {
  const [search, setSearch] = useState('');
  const [filterResult, setFilterResult] = useState('all');
  const [filterSession, setFilterSession] = useState('all');
  const [filterStrategy, setFilterStrategy] = useState('all');
  const [selected, setSelected] = useState(null);
  const [aiReview, setAiReview] = useState({});
  const [loadingAI, setLoadingAI] = useState(null);
  const qc = useQueryClient();

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trade-review-all'],
    queryFn: () => base44.entities.Trade.list('-entry_time', 200),
  });

  const deleteTrade = useMutation({
    mutationFn: id => base44.entities.Trade.delete(id),
    onSuccess: () => { qc.invalidateQueries(['trade-review-all']); setSelected(null); toast.success('Trade supprimé'); }
  });

  const filtered = trades.filter(t => {
    if (filterResult !== 'all' && t.result !== filterResult) return false;
    if (filterSession !== 'all' && t.session !== filterSession) return false;
    if (filterStrategy !== 'all' && t.strategy !== filterStrategy) return false;
    if (search && !t.symbol?.toLowerCase().includes(search.toLowerCase()) && !t.setup?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const analyzeTradeAI = async (trade) => {
    setLoadingAI(trade.id);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Expert ICT/SMC NQ Futures. Analyse approfondie de ce trade clôturé.

${trade.direction} ${trade.symbol} | ${trade.strategy || 'N/A'} | ${trade.session || 'N/A'} | ${trade.timeframe || 'N/A'}
Entry: ${trade.entry_price} | SL: ${trade.stop_loss || 'N/A'} | TP: ${trade.take_profit_1 || 'N/A'}
PnL: ${trade.pnl}€ | Résultat: ${trade.result} | R:R: ${trade.risk_reward || 'N/A'}
Patterns: ${trade.pattern || 'N/A'} | Notes: ${trade.setup || 'N/A'}
Erreurs notées: ${trade.mistakes || 'Aucune'}

Retourne JSON:
{
  "grade": "A"|"B"|"C"|"D"|"F",
  "score": <0-100>,
  "execution_quality": "excellent"|"good"|"average"|"poor",
  "what_worked": "<ce qui a fonctionné>",
  "what_failed": "<ce qui a échoué ou null>",
  "lesson": "<leçon principale>",
  "replay": "<comment rejouer ce trade>",
  "tags": ["<tag1>","<tag2>"]
}`,
      response_json_schema: { type: "object", properties: { grade: { type: "string" }, score: { type: "number" }, execution_quality: { type: "string" }, what_worked: { type: "string" }, what_failed: { type: "string" }, lesson: { type: "string" }, replay: { type: "string" }, tags: { type: "array", items: { type: "string" } } } }
    });
    setAiReview(prev => ({ ...prev, [trade.id]: res }));
    setLoadingAI(null);
    toast.success(`Review IA — Grade ${res.grade} (${res.score}/100)`);
  };

  const exportCSV = () => {
    const rows = [['Date', 'Symbole', 'Direction', 'Stratégie', 'Session', 'Entry', 'SL', 'TP1', 'PnL', 'Résultat', 'R:R', 'Patterns']];
    filtered.forEach(t => rows.push([t.entry_time?.slice(0, 10), t.symbol, t.direction, t.strategy, t.session, t.entry_price, t.stop_loss, t.take_profit_1, t.pnl, t.result, t.risk_reward, t.pattern]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'trades_review.csv'; a.click();
  };

  const gradeColor = { A: 'text-primary', B: 'text-green-400', C: 'text-yellow-400', D: 'text-orange-400', F: 'text-destructive' };

  const totalPnl = filtered.reduce((s, t) => s + (t.pnl || 0), 0);
  const winRate = filtered.length > 0 ? Math.round(filtered.filter(t => t.result === 'win').length / filtered.length * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-400" />
            Trade Review
          </h1>
          <p className="text-xs text-muted-foreground">Analyse approfondie trade par trade · IA Review · Filtres avancés · {trades.length} trades</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1 text-xs h-8">
          <Download className="w-3 h-3" />Export CSV
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { l: 'Total', v: filtered.length, c: 'text-foreground' },
          { l: 'Wins', v: filtered.filter(t => t.result === 'win').length, c: 'text-primary' },
          { l: 'Losses', v: filtered.filter(t => t.result === 'loss').length, c: 'text-destructive' },
          { l: 'Win Rate', v: `${winRate}%`, c: winRate >= 60 ? 'text-primary' : 'text-yellow-400' },
          { l: 'PnL Total', v: `${totalPnl >= 0 ? '+' : ''}${totalPnl}€`, c: totalPnl >= 0 ? 'text-primary' : 'text-destructive' },
          { l: 'Avg R:R', v: (filtered.filter(t => t.risk_reward).reduce((s, t) => s + t.risk_reward, 0) / (filtered.filter(t => t.risk_reward).length || 1)).toFixed(1), c: 'text-blue-400' },
        ].map(s => (
          <div key={s.l} className="card-trading text-center py-2">
            <div className={`text-base font-bold font-mono ${s.c}`}>{s.v}</div>
            <div className="text-[10px] text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Chercher symbole/setup..." value={search} onChange={e => setSearch(e.target.value)} className="bg-secondary border-border h-8 text-xs flex-1 min-w-32" />
        {[
          { val: filterResult, set: setFilterResult, opts: [['all','Tous résultats'],['win','Wins'],['loss','Losses'],['breakeven','BE']] },
          { val: filterStrategy, set: setFilterStrategy, opts: [['all','Toutes stratégies'],['ICT/SMC','ICT/SMC'],['AMD/IFVG','AMD/IFVG'],['Pullback','Pullback'],['Breakout','Breakout']] },
          { val: filterSession, set: setFilterSession, opts: [['all','Toutes sessions'],['London','London'],['New York','New York'],['Asian','Asian']] },
        ].map((f, i) => (
          <Select key={i} value={f.val} onValueChange={f.set}>
            <SelectTrigger className="h-8 bg-secondary border-border text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{f.opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        ))}
      </div>

      {/* Liste des trades */}
      <div className="space-y-1.5">
        {isLoading && <div className="text-xs text-muted-foreground text-center py-8">Chargement...</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="card-trading text-center py-12 text-xs text-muted-foreground">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-20" />
            Aucun trade — ajoutez des trades via Trade Builder
          </div>
        )}
        {filtered.map(t => {
          const review = aiReview[t.id];
          return (
            <div key={t.id} className={`card-trading border transition-all cursor-pointer hover:border-primary/20 ${selected?.id === t.id ? 'border-blue-400/40 bg-blue-400/5' : 'border-border'}`}
              onClick={() => setSelected(selected?.id === t.id ? null : t)}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-muted-foreground w-20 flex-shrink-0">{t.entry_time?.slice(0, 10) || '—'}</span>
                <span className="font-bold font-mono text-sm">{t.symbol}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${t.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{t.direction}</span>
                <span className="text-xs text-muted-foreground flex-1 truncate">{t.strategy || t.setup || '—'}</span>
                {t.session && <span className="text-[10px] text-muted-foreground hidden md:inline">{t.session}</span>}
                {t.risk_reward && <span className="text-[10px] font-mono text-blue-400">{t.risk_reward}:1</span>}
                {review && <span className={`text-xs font-bold ${gradeColor[review.grade]}`}>{review.grade}</span>}
                <span className={`font-mono font-bold text-sm ${(t.pnl || 0) > 0 ? 'text-primary' : (t.pnl || 0) < 0 ? 'text-destructive' : 'text-yellow-400'}`}>
                  {(t.pnl || 0) > 0 ? '+' : ''}{(t.pnl || 0)}€
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.result === 'win' ? 'bg-primary/20 text-primary' : t.result === 'loss' ? 'bg-destructive/20 text-destructive' : 'bg-yellow-400/20 text-yellow-400'}`}>{t.result || '—'}</span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-auto text-muted-foreground hover:text-primary"
                  onClick={e => { e.stopPropagation(); analyzeTradeAI(t); }} disabled={loadingAI === t.id}>
                  <Brain className={`w-3 h-3 ${loadingAI === t.id ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {selected?.id === t.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {[
                      { l: 'Entry', v: t.entry_price, c: 'text-blue-400' },
                      { l: 'SL', v: t.stop_loss || '—', c: 'text-destructive' },
                      { l: 'TP1', v: t.take_profit_1 || '—', c: 'text-green-400' },
                      { l: 'Lots', v: t.lot_size || '—', c: 'text-foreground' },
                    ].map(f => (
                      <div key={f.l} className="p-2 rounded bg-secondary/50 text-center">
                        <div className="text-[10px] text-muted-foreground">{f.l}</div>
                        <div className={`font-mono font-bold ${f.c}`}>{f.v}</div>
                      </div>
                    ))}
                  </div>
                  {t.pattern && <div className="text-xs text-muted-foreground"><span className="text-foreground">Patterns: </span>{t.pattern}</div>}
                  {t.setup && <div className="text-xs text-muted-foreground"><span className="text-foreground">Notes: </span>{t.setup}</div>}
                  {t.mistakes && <div className="text-xs text-orange-400"><span className="text-muted-foreground">Erreurs: </span>{t.mistakes}</div>}

                  {review && (
                    <div className={`p-3 rounded border space-y-2 ${review.grade === 'A' || review.grade === 'B' ? 'border-primary/30 bg-primary/5' : review.grade === 'F' ? 'border-destructive/30 bg-destructive/5' : 'border-yellow-400/30 bg-yellow-400/5'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-bold font-mono ${gradeColor[review.grade]}`}>{review.grade}</span>
                        <div>
                          <div className="text-xs font-semibold">{review.score}/100 · {review.execution_quality}</div>
                          {review.tags?.length > 0 && (
                            <div className="flex gap-1 flex-wrap mt-0.5">
                              {review.tags.map((tag, i) => <span key={i} className="text-[9px] px-1 rounded bg-secondary text-muted-foreground">{tag}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                      {review.what_worked && <div className="text-xs"><span className="text-primary">✓ </span><span className="text-muted-foreground">{review.what_worked}</span></div>}
                      {review.what_failed && <div className="text-xs"><span className="text-destructive">✗ </span><span className="text-muted-foreground">{review.what_failed}</span></div>}
                      <div className="text-xs p-1.5 bg-primary/5 border border-primary/20 rounded"><span className="text-yellow-400">💡 </span><span className="text-muted-foreground">{review.lesson}</span></div>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={e => { e.stopPropagation(); deleteTrade.mutate(t.id); }}>
                      <Trash2 className="w-3 h-3 mr-1" />Supprimer
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}