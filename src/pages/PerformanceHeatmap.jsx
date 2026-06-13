import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Activity, TrendingUp, Target, Calendar, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function PerformanceHeatmap() {
  const [metric, setMetric] = useState('winrate');
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const { data: trades = [] } = useQuery({
    queryKey: ['heatmap-trades'],
    queryFn: () => base44.entities.Trade.list('-entry_time', 500),
  });

  // Construction de la heatmap 7x24
  const heatmap = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ wins: 0, losses: 0, pnl: 0, count: 0 })));
    trades.filter(t => t.entry_time && t.status === 'closed').forEach(t => {
      const d = new Date(t.entry_time);
      const dayIdx = (d.getDay() + 6) % 7; // 0=Lun
      const hourIdx = d.getHours();
      const cell = grid[dayIdx][hourIdx];
      cell.count++;
      cell.pnl += t.pnl || 0;
      if (t.result === 'win') cell.wins++;
      if (t.result === 'loss') cell.losses++;
    });
    return grid;
  }, [trades]);

  const getValue = (cell) => {
    if (cell.count === 0) return null;
    if (metric === 'winrate') return cell.count > 0 ? Math.round((cell.wins / cell.count) * 100) : 0;
    if (metric === 'pnl') return cell.pnl;
    if (metric === 'trades') return cell.count;
    return 0;
  };

  const allValues = heatmap.flat().map(c => getValue(c)).filter(v => v !== null);
  const maxVal = allValues.length > 0 ? Math.max(...allValues.map(Math.abs)) : 1;

  const getColor = (cell) => {
    const v = getValue(cell);
    if (v === null) return 'bg-secondary/20 text-muted-foreground/30';
    if (metric === 'winrate') {
      if (v >= 70) return 'bg-green-500/80 text-white';
      if (v >= 55) return 'bg-green-400/50 text-green-200';
      if (v >= 40) return 'bg-yellow-400/40 text-yellow-200';
      return 'bg-red-500/50 text-red-200';
    }
    if (metric === 'pnl') {
      if (v > 0) {
        const intensity = Math.min(v / maxVal, 1);
        return intensity > 0.6 ? 'bg-green-500/80 text-white' : intensity > 0.3 ? 'bg-green-400/50 text-green-200' : 'bg-green-400/20 text-green-300';
      }
      const intensity = Math.min(Math.abs(v) / maxVal, 1);
      return intensity > 0.6 ? 'bg-red-500/80 text-white' : 'bg-red-400/40 text-red-200';
    }
    const intensity = Math.min(v / maxVal, 1);
    return intensity > 0.7 ? 'bg-primary/80 text-primary-foreground' : intensity > 0.4 ? 'bg-primary/40 text-primary' : 'bg-primary/20 text-primary/70';
  };

  // Stats globales par heure et par jour
  const hourStats = HOURS.map(h => {
    const cells = heatmap.map(row => row[h]);
    const total = cells.reduce((s, c) => s + c.count, 0);
    const wins = cells.reduce((s, c) => s + c.wins, 0);
    const pnl = cells.reduce((s, c) => s + c.pnl, 0);
    return { h, total, wr: total > 0 ? Math.round(wins / total * 100) : 0, pnl };
  });

  const dayStats = DAYS.map((d, i) => {
    const row = heatmap[i];
    const total = row.reduce((s, c) => s + c.count, 0);
    const wins = row.reduce((s, c) => s + c.wins, 0);
    const pnl = row.reduce((s, c) => s + c.pnl, 0);
    return { d, total, wr: total > 0 ? Math.round(wins / total * 100) : 0, pnl };
  });

  const bestHour = hourStats.filter(h => h.total >= 2).sort((a, b) => b.wr - a.wr)[0];
  const bestDay = dayStats.filter(d => d.total >= 2).sort((a, b) => b.wr - a.wr)[0];
  const worstHour = hourStats.filter(h => h.total >= 2).sort((a, b) => a.wr - b.wr)[0];

  const getAIInsight = async () => {
    if (trades.length < 5) { toast.error('Pas assez de trades (min 5)'); return; }
    setLoadingAI(true);
    const summary = dayStats.map(d => `${d.d}: ${d.total} trades, WR ${d.wr}%, PnL ${d.pnl}€`).join(' | ');
    const hourSummary = hourStats.filter(h => h.total > 0).map(h => `${h.h}h: WR ${h.wr}%`).join(', ');
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Expert trading. Analyse cette heatmap de performance par heure/jour.
Stats par jour: ${summary}
Stats par heure (résumé): ${hourSummary}
Total trades: ${trades.length}

Retourne JSON: {"best_windows":["<fenêtre 1>","<fenêtre 2>"],"avoid_times":["<heure/jour à éviter>"],"pattern":"<pattern principal détecté>","recommendation":"<conseil actionnable>","schedule":"<emploi du temps idéal>"}`,
      response_json_schema: { type: "object", properties: { best_windows: { type: "array", items: { type: "string" } }, avoid_times: { type: "array", items: { type: "string" } }, pattern: { type: "string" }, recommendation: { type: "string" }, schedule: { type: "string" } } }
    });
    setAiInsight(res);
    setLoadingAI(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Heatmap Performance
          </h1>
          <p className="text-xs text-muted-foreground">Performance par heure et jour de la semaine · {trades.length} trades analysés</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="h-8 bg-secondary border-border text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="winrate">Win Rate %</SelectItem>
              <SelectItem value="pnl">PnL (€)</SelectItem>
              <SelectItem value="trades">Nb Trades</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={getAIInsight} disabled={loadingAI} className="gap-1 text-xs h-8">
            <Brain className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
            Analyse IA
          </Button>
        </div>
      </div>

      {/* KPIs rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Meilleure heure', v: bestHour ? `${bestHour.h}h (${bestHour.wr}% WR)` : '—', c: 'text-primary', icon: TrendingUp },
          { l: 'Meilleur jour', v: bestDay ? `${bestDay.d} (${bestDay.wr}% WR)` : '—', c: 'text-primary', icon: Calendar },
          { l: 'Pire heure', v: worstHour ? `${worstHour.h}h (${worstHour.wr}% WR)` : '—', c: 'text-destructive', icon: Activity },
          { l: 'Trades analysés', v: trades.filter(t => t.entry_time).length, c: 'text-blue-400', icon: Target },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.l} className="card-trading flex items-center gap-3">
              <Icon className={`w-4 h-4 ${s.c} flex-shrink-0`} />
              <div>
                <div className={`text-sm font-bold font-mono ${s.c}`}>{s.v}</div>
                <div className="text-[10px] text-muted-foreground">{s.l}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Heatmap principale */}
      <div className="card-trading overflow-x-auto">
        <div className="text-sm font-semibold mb-3">Heatmap {metric === 'winrate' ? 'Win Rate' : metric === 'pnl' ? 'PnL' : 'Nb Trades'} — Heure × Jour</div>
        {trades.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted-foreground">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-20" />
            Importez des trades pour générer la heatmap
          </div>
        ) : (
          <div className="min-w-[600px]">
            {/* Header heures */}
            <div className="flex mb-1">
              <div className="w-8 flex-shrink-0" />
              {HOURS.filter(h => h % 2 === 0).map(h => (
                <div key={h} className="text-[8px] text-muted-foreground text-center" style={{ width: '8.33%' }}>{h}h</div>
              ))}
            </div>
            {/* Rows */}
            {heatmap.map((row, dayIdx) => (
              <div key={dayIdx} className="flex items-center mb-0.5">
                <div className="w-8 text-[9px] text-muted-foreground flex-shrink-0 text-right pr-1">{DAYS[dayIdx]}</div>
                {row.map((cell, hourIdx) => {
                  const v = getValue(cell);
                  const display = v === null ? '' : metric === 'pnl' ? (v > 0 ? `+${v}` : `${v}`) : v;
                  return (
                    <div key={hourIdx} title={`${DAYS[dayIdx]} ${hourIdx}h — ${cell.count} trades, WR ${cell.count > 0 ? Math.round(cell.wins / cell.count * 100) : 0}%, PnL ${cell.pnl}€`}
                      className={`flex-1 h-7 flex items-center justify-center text-[8px] font-mono rounded-sm mx-px cursor-default transition-transform hover:scale-110 ${getColor(cell)}`}>
                      {cell.count > 0 ? display : ''}
                    </div>
                  );
                })}
              </div>
            ))}
            {/* Légende */}
            <div className="flex items-center gap-3 mt-3 text-[9px] text-muted-foreground">
              <span>Légende:</span>
              {metric === 'winrate' && (
                <>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500/80" /><span>≥70%</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-400/40" /><span>40-55%</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500/50" /><span>&lt;40%</span></div>
                </>
              )}
              {metric === 'pnl' && (
                <>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500/80" /><span>Gain fort</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500/80" /><span>Perte forte</span></div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats par jour */}
      <div className="grid grid-cols-7 gap-2">
        {dayStats.map(d => (
          <div key={d.d} className={`card-trading text-center py-2 border ${d.wr >= 60 ? 'border-primary/20' : d.total === 0 ? 'border-border opacity-40' : 'border-border'}`}>
            <div className="text-xs font-bold text-muted-foreground">{d.d}</div>
            <div className={`text-sm font-bold font-mono mt-1 ${d.wr >= 60 ? 'text-primary' : d.wr >= 45 ? 'text-yellow-400' : d.total === 0 ? 'text-muted-foreground' : 'text-destructive'}`}>{d.total > 0 ? `${d.wr}%` : '—'}</div>
            <div className="text-[9px] text-muted-foreground">{d.total} trades</div>
            <div className={`text-[9px] font-mono ${d.pnl > 0 ? 'text-green-400' : d.pnl < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>{d.pnl > 0 ? '+' : ''}{d.pnl}€</div>
          </div>
        ))}
      </div>

      {aiInsight && (
        <div className="card-trading border border-purple-400/30 bg-purple-400/5 space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold">Analyse IA — Fenêtres Optimales</span>
          </div>
          <p className="text-xs text-muted-foreground italic">{aiInsight.pattern}</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] text-primary font-semibold uppercase mb-1">✅ Meilleures fenêtres</div>
              {aiInsight.best_windows?.map((w, i) => <div key={i} className="p-1.5 bg-primary/5 border border-primary/20 rounded mb-1 text-muted-foreground">{w}</div>)}
            </div>
            <div>
              <div className="text-[10px] text-destructive font-semibold uppercase mb-1">⛔ À éviter</div>
              {aiInsight.avoid_times?.map((t, i) => <div key={i} className="p-1.5 bg-destructive/5 border border-destructive/20 rounded mb-1 text-muted-foreground">{t}</div>)}
            </div>
          </div>
          <div className="p-2 bg-yellow-400/5 border border-yellow-400/20 rounded text-xs">
            <span className="text-yellow-400 font-semibold">Planning idéal: </span>
            <span className="text-muted-foreground">{aiInsight.schedule}</span>
          </div>
          <p className="text-xs text-primary">💡 {aiInsight.recommendation}</p>
        </div>
      )}
    </div>
  );
}