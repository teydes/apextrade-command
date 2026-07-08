import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Tag, Plus, Trash2, Brain, Loader2, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function TradeTagsAnalyzer() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customTags, setCustomTags] = useState(['high_conviction', 'fomc_day', 'end_of_month', 'revenge_trade', 'a+setup']);
  const [newTag, setNewTag] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(data => {
      setTrades((data || []).filter(t => t.status === 'closed'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const tagStats = useMemo(() => {
    if (trades.length < 3) return [];
    const autoTags = {};
    trades.forEach(t => {
      const tags = [];
      if (t.risk_reward >= 3) tags.push('high_rr');
      if (t.risk_reward < 1) tags.push('low_rr');
      if (t.pnl > 0) tags.push('profitable');
      if (t.pnl < 0) tags.push('losing');
      if (t.session === 'Overlap London-NY') tags.push('overlap_session');
      if (t.news_impact === 'high' || t.news_impact === 'medium') tags.push('news_event');
      if (t.mistakes) tags.push('with_mistakes');
      if (t.signal_source === 'auto' || t.signal_source === 'agent') tags.push('auto_signal');
      if (t.strategy === 'ICT/SMC' || t.strategy === 'AMD/IFVG') tags.push('smc_strategy');
      if (t.result === 'win' && t.risk_reward >= 2) tags.push('a_trade');

      tags.forEach(tag => {
        if (!autoTags[tag]) autoTags[tag] = { tag, trades: 0, wins: 0, pnl: 0, pnlList: [] };
        autoTags[tag].trades++;
        if (t.result === 'win') autoTags[tag].wins++;
        autoTags[tag].pnl += t.pnl || 0;
        autoTags[tag].pnlList.push(t.pnl || 0);
      });
    });

    return Object.values(autoTags).map(s => ({
      ...s,
      winRate: s.trades > 0 ? (s.wins / s.trades) * 100 : 0,
      avgPnL: s.trades > 0 ? s.pnl / s.trades : 0,
      expectancy: s.trades > 0 ? s.pnl / s.trades : 0,
    })).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const top = tagStats.slice(0, 5).map(t => `${t.tag}: ${t.trades}t, WR=${t.winRate.toFixed(0)}%, PnL=${t.pnl.toFixed(0)}`).join('; ');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse par tags: ${top}. Identifie: 1) Tags les plus profitables, 2) Tags à risque, 3) Recommandation de focus. Court.`,
        response_json_schema: { type: 'object', properties: { best_tags: { type: 'string' }, risk_tags: { type: 'string' }, focus: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ best_tags: 'Erreur', risk_tags: '', focus: '' }); }
    setAiLoading(false);
  };

  const addTag = () => { if (newTag && !customTags.includes(newTag)) { setCustomTags([...customTags, newTag]); setNewTag(''); } };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Tag className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Trade Tags Analyzer</h1>
          <p className="text-sm text-muted-foreground">Performance par tags automatiques et personnalisés</p>
        </div>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Tags personnalisés</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nouveau tag..." onKeyDown={e => e.key === 'Enter' && addTag()} />
            <Button onClick={addTag}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {customTags.map(tag => (
              <span key={tag} className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-sm">
                {tag}
                <button onClick={() => setCustomTags(customTags.filter(t => t !== tag))}><Trash2 className="w-3 h-3 text-danger-red" /></button>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {tagStats.length === 0 ? (
        <Card className="card-trading"><CardContent className="py-12 text-center text-muted-foreground">Pas assez de trades</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="card-trading">
              <CardHeader><CardTitle className="text-sm">PnL par Tag</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tagStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                    <XAxis type="number" stroke="hsl(215 20% 55%)" />
                    <YAxis type="category" dataKey="tag" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} width={100} />
                    <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                    <Bar dataKey="pnl" name="PnL" radius={[0, 4, 4, 0]}>
                      {tagStats.map((entry, i) => <Cell key={i} fill={entry.pnl > 0 ? '#00FF88' : '#EF4444'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="card-trading">
              <CardHeader><CardTitle className="text-sm">Win Rate par Tag</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tagStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                    <XAxis type="number" stroke="hsl(215 20% 55%)" unit="%" />
                    <YAxis type="category" dataKey="tag" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} width={100} />
                    <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                    <Bar dataKey="winRate" name="Win Rate %" radius={[0, 4, 4, 0]} fill="#0088FF" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="card-trading">
            <CardHeader><CardTitle className="text-sm">Détail par Tag</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Tag</th>
                      <th className="text-right p-2">Trades</th>
                      <th className="text-right p-2">Win Rate</th>
                      <th className="text-right p-2">Total PnL</th>
                      <th className="text-right p-2">Avg PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tagStats.map(s => (
                      <tr key={s.tag} className="border-b border-border/50 row-hover">
                        <td className="p-2"><span className="px-2 py-1 rounded bg-secondary text-xs font-mono">{s.tag}</span></td>
                        <td className="p-2 text-right font-mono">{s.trades}</td>
                        <td className="p-2 text-right font-mono text-primary">{s.winRate.toFixed(0)}%</td>
                        <td className={`p-2 text-right font-mono ${s.pnl > 0 ? 'text-primary' : 'text-danger-red'}`}>{s.pnl > 0 ? '+' : ''}{s.pnl.toFixed(0)}</td>
                        <td className={`p-2 text-right font-mono ${s.avgPnL > 0 ? 'text-primary' : 'text-danger-red'}`}>{s.avgPnL > 0 ? '+' : ''}{s.avgPnL.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="card-trading">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA des Tags</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={runAI} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Analyser les patterns de tags
              </Button>
              {aiAnalysis && (
                <div className="space-y-2 text-sm">
                  <div><span className="text-primary font-bold">Meilleurs tags:</span> {aiAnalysis.best_tags}</div>
                  <div><span className="text-primary font-bold">Tags à risque:</span> {aiAnalysis.risk_tags}</div>
                  <div><span className="text-primary font-bold">Focus:</span> {aiAnalysis.focus}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}