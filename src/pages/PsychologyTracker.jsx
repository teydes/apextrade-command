import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, TrendingUp, AlertTriangle, Smile, Frown, Zap, Target, Brain as BrainIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip } from 'recharts';
import { toast } from 'sonner';

const MOOD_CONFIG = {
  confident: { label: 'Confiant', color: '#00FF88', icon: Smile },
  neutral: { label: 'Neutre', color: '#0088FF', icon: Target },
  anxious: { label: 'Anxieux', color: '#F59E0B', icon: AlertTriangle },
  frustrated: { label: 'Frustré', color: '#EF4444', icon: Frown },
  euphoric: { label: 'Euphorique', color: '#A855F7', icon: Zap },
  tilt: { label: 'TILT', color: '#DC2626', icon: AlertTriangle },
};

export default function PsychologyTracker() {
  const [showForm, setShowForm] = useState(false);
  const [aiAdvice, setAiAdvice] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), mood: 'neutral', discipline_score: 70, fomo_level: 3, fatigue_level: 3, trades_taken: 0, trades_planned: 3, rules_followed: true, overtrading: false, revenge_trading: false, session_quality: 'good', notes: '' });
  const qc = useQueryClient();

  const { data: entries = [] } = useQuery({ queryKey: ['psych-entries'], queryFn: () => base44.entities.PsychologyEntry.list('-date', 100) });

  const saveEntry = useMutation({
    mutationFn: data => base44.entities.PsychologyEntry.create(data),
    onSuccess: () => { qc.invalidateQueries(['psych-entries']); setShowForm(false); toast.success('Entrée psychologique enregistrée'); }
  });

  const avgDiscipline = entries.length > 0 ? Math.round(entries.reduce((s, e) => s + (e.discipline_score || 0), 0) / entries.length) : 0;
  const avgFomo = entries.length > 0 ? (entries.reduce((s, e) => s + (e.fomo_level || 0), 0) / entries.length).toFixed(1) : '0';
  const tiltDays = entries.filter(e => e.mood === 'tilt' || e.revenge_trading).length;
  const overtradeDays = entries.filter(e => e.overtrading).length;
  const rulesPct = entries.length > 0 ? Math.round(entries.filter(e => e.rules_followed).length / entries.length * 100) : 0;

  const chartData = entries.slice(0, 30).reverse().map(e => ({ date: e.date?.slice(5), discipline: e.discipline_score || 0, fomo: e.fomo_level || 0, fatigue: e.fatigue_level || 0 }));

  const getAIAdvice = async () => {
    if (entries.length < 3) { toast.error('Min 3 entrées'); return; }
    setLoadingAI(true);
    const summary = `Discipline moy: ${avgDiscipline}/100, FOMO moy: ${avgFomo}/10, Tilt days: ${tiltDays}, Overtrading days: ${overtradeDays}, Rules suivies: ${rulesPct}%`;
    const recent = entries.slice(0, 7).map(e => `${e.date}: ${e.mood}, disc ${e.discipline_score}, fomo ${e.fomo_level}, ${e.overtrading ? 'OVERTRADING' : ''} ${e.revenge_trading ? 'REVENGE' : ''}`).join(' | ');
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Psychologue du trading. Profil: ${summary}. 7 derniers jours: ${recent}. Retourne JSON: {"state":"<état mental global>","pattern":"<pattern détecté>","risks":["<risque1>","<risque2>"],"advice":"<conseil actionnable>","routine":"<routine recommandée>","score_mental":<0-100>}`,
      response_json_schema: { type: "object", properties: { state: { type: "string" }, pattern: { type: "string" }, risks: { type: "array", items: { type: "string" } }, advice: { type: "string" }, routine: { type: "string" }, score_mental: { type: "number" } } }
    });
    setAiAdvice(res); setLoadingAI(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Brain className="w-5 h-5 text-purple-400" />Psychology Tracker</h1>
          <p className="text-xs text-muted-foreground">Discipline · FOMO · Tilt · Patterns comportementaux · {entries.length} entrées</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={getAIAdvice} disabled={loadingAI} className="gap-1 text-xs"><BrainIcon className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />Analyse IA</Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="text-xs">+ Nouvelle entrée</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[{ l: 'Discipline moy.', v: `${avgDiscipline}`, c: avgDiscipline >= 70 ? 'text-primary' : 'text-yellow-400', s: '/100' },
          { l: 'FOMO moy.', v: avgFomo, c: parseFloat(avgFomo) >= 5 ? 'text-destructive' : 'text-primary', s: '/10' },
          { l: 'Jours Tilt', v: tiltDays, c: tiltDays > 0 ? 'text-destructive' : 'text-muted-foreground', s: '' },
          { l: 'Overtrading', v: overtradeDays, c: overtradeDays > 2 ? 'text-destructive' : 'text-muted-foreground', s: 'j' },
          { l: 'Règles suivies', v: rulesPct, c: rulesPct >= 80 ? 'text-primary' : 'text-destructive', s: '%' }
        ].map(s => (
          <div key={s.l} className="card-trading text-center"><div className={`text-lg font-bold font-mono ${s.c}`}>{s.v}<span className="text-xs text-muted-foreground">{s.s}</span></div><div className="text-[10px] text-muted-foreground">{s.l}</div></div>
        ))}
      </div>

      {showForm && (
        <div className="card-trading border border-purple-400/30 space-y-3">
          <div className="text-sm font-semibold">Nouvelle entrée — {form.date}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="text-[10px] text-muted-foreground">Humeur</label><Select value={form.mood} onValueChange={v => setForm({ ...form, mood: v })}><SelectTrigger className="h-8 bg-secondary text-xs"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(MOOD_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="text-[10px] text-muted-foreground">Discipline (0-100)</label><Input type="number" value={form.discipline_score} onChange={e => setForm({ ...form, discipline_score: +e.target.value })} className="h-8 bg-secondary text-xs" /></div>
            <div><label className="text-[10px] text-muted-foreground">FOMO (0-10)</label><Input type="number" value={form.fomo_level} onChange={e => setForm({ ...form, fomo_level: +e.target.value })} className="h-8 bg-secondary text-xs" /></div>
            <div><label className="text-[10px] text-muted-foreground">Fatigue (0-10)</label><Input type="number" value={form.fatigue_level} onChange={e => setForm({ ...form, fatigue_level: +e.target.value })} className="h-8 bg-secondary text-xs" /></div>
            <div><label className="text-[10px] text-muted-foreground">Trades pris</label><Input type="number" value={form.trades_taken} onChange={e => setForm({ ...form, trades_taken: +e.target.value })} className="h-8 bg-secondary text-xs" /></div>
            <div><label className="text-[10px] text-muted-foreground">Trades planifiés</label><Input type="number" value={form.trades_planned} onChange={e => setForm({ ...form, trades_planned: +e.target.value })} className="h-8 bg-secondary text-xs" /></div>
            <div><label className="text-[10px] text-muted-foreground">Qualité session</label><Select value={form.session_quality} onValueChange={v => setForm({ ...form, session_quality: v })}><SelectTrigger className="h-8 bg-secondary text-xs"><SelectValue /></SelectTrigger><SelectContent>{['excellent','good','average','poor'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex items-end gap-3 pb-1">
              <label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={form.rules_followed} onChange={e => setForm({ ...form, rules_followed: e.target.checked })} /> Règles</label>
              <label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={form.overtrading} onChange={e => setForm({ ...form, overtrading: e.target.checked })} /> Overtrade</label>
              <label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={form.revenge_trading} onChange={e => setForm({ ...form, revenge_trading: e.target.checked })} /> Revenge</label>
            </div>
          </div>
          <Textarea placeholder="Notes du jour..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="bg-secondary text-xs" rows={2} />
          <Button size="sm" onClick={() => saveEntry.mutate(form)} disabled={saveEntry.isPending}>Enregistrer</Button>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="card-trading">
          <div className="text-sm font-semibold mb-2">Évolution Discipline / FOMO / Fatigue</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 9, fill: '#6B7280' }} domain={[0, 100]} />
              <RTooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', fontSize: 11 }} />
              <Line type="monotone" dataKey="discipline" stroke="#00FF88" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="fomo" stroke="#EF4444" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="fatigue" stroke="#F59E0B" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {aiAdvice && (
        <div className="card-trading border border-purple-400/30 bg-purple-400/5 space-y-3">
          <div className="flex items-center gap-3"><Brain className="w-4 h-4 text-purple-400" /><span className="text-sm font-semibold">Analyse Psychologique IA</span><span className="ml-auto text-lg font-bold font-mono text-purple-400">{aiAdvice.score_mental}/100</span></div>
          <p className="text-xs text-muted-foreground italic">{aiAdvice.state} — {aiAdvice.pattern}</p>
          {aiAdvice.risks?.length > 0 && <div className="space-y-1">{aiAdvice.risks.map((r, i) => <div key={i} className="text-xs text-destructive pl-2 border-l-2 border-destructive/50">⚠️ {r}</div>)}</div>}
          <div className="p-2 bg-primary/5 border border-primary/20 rounded text-xs"><span className="text-primary font-semibold">💡 </span><span className="text-muted-foreground">{aiAdvice.advice}</span></div>
          <div className="p-2 bg-blue-400/5 border border-blue-400/20 rounded text-xs"><span className="text-blue-400 font-semibold">Routine: </span><span className="text-muted-foreground">{aiAdvice.routine}</span></div>
        </div>
      )}

      <div className="space-y-1.5">
        {entries.slice(0, 20).map(e => {
          const cfg = MOOD_CONFIG[e.mood] || MOOD_CONFIG.neutral;
          const Icon = cfg.icon;
          return (
            <div key={e.id} className="card-trading flex items-center gap-3 flex-wrap text-xs">
              <span className="text-[10px] font-mono text-muted-foreground w-20">{e.date?.slice(5)}</span>
              <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: cfg.color }} />
              <span className="font-semibold w-16" style={{ color: cfg.color }}>{cfg.label}</span>
              <span className="text-muted-foreground">Disc: <strong className={e.discipline_score >= 70 ? 'text-primary' : 'text-yellow-400'}>{e.discipline_score}</strong></span>
              <span className="text-muted-foreground">FOMO: <strong className={e.fomo_level >= 5 ? 'text-destructive' : 'text-foreground'}>{e.fomo_level}</strong></span>
              <span className="text-muted-foreground">{e.trades_taken}/{e.trades_planned} trades</span>
              {e.overtrading && <span className="text-[10px] px-1.5 rounded bg-destructive/20 text-destructive">OVER</span>}
              {e.revenge_trading && <span className="text-[10px] px-1.5 rounded bg-red-500/20 text-red-400">REVENGE</span>}
              {!e.rules_followed && <span className="text-[10px] px-1.5 rounded bg-yellow-400/20 text-yellow-400">RULES BROKEN</span>}
              {e.notes && <span className="text-muted-foreground truncate flex-1">— {e.notes}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}