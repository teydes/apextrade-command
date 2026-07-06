import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus, CheckCircle2, Circle, TrendingUp, Shield, Brain, Play, Pause, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const STRATEGIES = ['ICT/SMC', 'AMD/IFVG', 'Footprint', 'Order Book', 'Pullback', 'Breakout', 'Range', 'Trend Following', 'Mean Reversion', 'Scalping', 'Mixed'];

export default function TradingPlanBuilder() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiReview, setAiReview] = useState({});
  const [loadingAI, setLoadingAI] = useState(null);
  const qc = useQueryClient();

  const { data: plans = [] } = useQuery({ queryKey: ['trading-plans'], queryFn: () => base44.entities.TradingPlan.list('-created_date', 50) });

  const [form, setForm] = useState({
    name: '', asset_class: 'futures', timeframe: 'M15', session: 'New York', strategy: 'ICT/SMC',
    entry_rules: [''], exit_rules: [''], risk_rules: [''],
    max_trades_per_day: 3, max_daily_loss: 3, risk_per_trade: 1, min_rr: 2,
    checklist: [{ item: '', required: true }], notes: '', status: 'draft'
  });

  const savePlan = useMutation({
    mutationFn: data => {
      const clean = { ...data, entry_rules: data.entry_rules.filter(r => r.trim()), exit_rules: data.exit_rules.filter(r => r.trim()), risk_rules: data.risk_rules.filter(r => r.trim()), checklist: data.checklist.filter(c => c.item.trim()) };
      return editing ? base44.entities.TradingPlan.update(editing, clean) : base44.entities.TradingPlan.create(clean);
    },
    onSuccess: () => { qc.invalidateQueries(['trading-plans']); setShowForm(false); setEditing(null); toast.success(editing ? 'Plan mis à jour' : 'Plan créé'); }
  });

  const updateStatus = (plan, status) => { base44.entities.TradingPlan.update(plan.id, { status }).then(() => { qc.invalidateQueries(['trading-plans']); toast.success(`Plan ${status}`); }); };

  const aiAnalyze = async (plan) => {
    setLoadingAI(plan.id);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Expert trading plan reviewer. Plan: ${plan.name}, Strategy: ${plan.strategy}, TF: ${plan.timeframe}, Session: ${plan.session}.
Entry rules: ${plan.entry_rules.join(' | ')}
Exit rules: ${plan.exit_rules.join(' | ')}
Risk rules: ${plan.risk_rules.join(' | ')}
Max trades/day: ${plan.max_trades_per_day}, Risk/trade: ${plan.risk_per_trade}%, Min R:R: ${plan.min_rr}, Max daily loss: ${plan.max_daily_loss}%
Checklist items: ${plan.checklist.map(c => c.item).join(', ')}

Retourne JSON: {"grade":"A-F","completeness":<0-100>,"gaps":["<manque1>"],"improvements":["<amelioration1>"],"risk_issues":["<risque1>"],"missing_rules":["<regle manquante>"],"verdict":"<verdict global>"}`,
      response_json_schema: { type: "object", properties: { grade: { type: "string" }, completeness: { type: "number" }, gaps: { type: "array", items: { type: "string" } }, improvements: { type: "array", items: { type: "string" } }, risk_issues: { type: "array", items: { type: "string" } }, missing_rules: { type: "array", items: { type: "string" } }, verdict: { type: "string" } } }
    });
    setAiReview(prev => ({ ...prev, [plan.id]: res })); setLoadingAI(null);
  };

  const gradeColor = { A: 'text-primary', B: 'text-green-400', C: 'text-yellow-400', D: 'text-orange-400', F: 'text-destructive' };

  const addField = (key) => setForm({ ...form, [key]: [...form[key], ''] });
  const updateField = (key, i, val) => { const arr = [...form[key]]; arr[i] = val; setForm({ ...form, [key]: arr }); };
  const removeField = (key, i) => setForm({ ...form, [key]: form[key].filter((_, idx) => idx !== i) });

  const SECTIONS = [
    { key: 'entry_rules', label: 'Regles d\'Entree', color: 'text-primary' },
    { key: 'exit_rules', label: 'Regles de Sortie', color: 'text-yellow-400' },
    { key: 'risk_rules', label: 'Regles de Risque', color: 'text-destructive' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Layers className="w-5 h-5 text-blue-400" />Trading Plan Builder</h1>
          <p className="text-xs text-muted-foreground">Plans structurés · Règles entry/exit/risk · Checklist · Validation IA · {plans.length} plans</p>
        </div>
        <Button size="sm" onClick={() => { setForm({ name: '', asset_class: 'futures', timeframe: 'M15', session: 'New York', strategy: 'ICT/SMC', entry_rules: [''], exit_rules: [''], risk_rules: [''], max_trades_per_day: 3, max_daily_loss: 3, risk_per_trade: 1, min_rr: 2, checklist: [{ item: '', required: true }], notes: '', status: 'draft' }); setEditing(null); setShowForm(!showForm); }} className="text-xs gap-1"><Plus className="w-3 h-3" />Nouveau plan</Button>
      </div>

      {showForm && (
        <div className="card-trading border border-blue-400/30 space-y-4">
          <div className="text-sm font-semibold">{editing ? 'Modifier' : 'Nouveau'} Plan de Trading</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="text-[10px] text-muted-foreground">Nom</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-8 bg-secondary text-xs" placeholder="NQ ICT Scalp" /></div>
            <div><label className="text-[10px] text-muted-foreground">Stratégie</label><Select value={form.strategy} onValueChange={v => setForm({ ...form, strategy: v })}><SelectTrigger className="h-8 bg-secondary text-xs"><SelectValue /></SelectTrigger><SelectContent>{STRATEGIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="text-[10px] text-muted-foreground">Timeframe</label><Select value={form.timeframe} onValueChange={v => setForm({ ...form, timeframe: v })}><SelectTrigger className="h-8 bg-secondary text-xs"><SelectValue /></SelectTrigger><SelectContent>{['M1','M5','M15','M30','H1','H4','D1'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="text-[10px] text-muted-foreground">Session</label><Select value={form.session} onValueChange={v => setForm({ ...form, session: v })}><SelectTrigger className="h-8 bg-secondary text-xs"><SelectValue /></SelectTrigger><SelectContent>{['London','New York','Asian','Overlap London-NY','All'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="text-[10px] text-muted-foreground">Max trades/jour</label><Input type="number" value={form.max_trades_per_day} onChange={e => setForm({ ...form, max_trades_per_day: +e.target.value })} className="h-8 bg-secondary text-xs" /></div>
            <div><label className="text-[10px] text-muted-foreground">Risque/trade %</label><Input type="number" step="0.1" value={form.risk_per_trade} onChange={e => setForm({ ...form, risk_per_trade: +e.target.value })} className="h-8 bg-secondary text-xs" /></div>
            <div><label className="text-[10px] text-muted-foreground">Min R:R</label><Input type="number" step="0.1" value={form.min_rr} onChange={e => setForm({ ...form, min_rr: +e.target.value })} className="h-8 bg-secondary text-xs" /></div>
            <div><label className="text-[10px] text-muted-foreground">Max perte jour %</label><Input type="number" step="0.1" value={form.max_daily_loss} onChange={e => setForm({ ...form, max_daily_loss: +e.target.value })} className="h-8 bg-secondary text-xs" /></div>
          </div>

          {SECTIONS.map(section => (
            <div key={section.key}>
              <div className={`text-xs font-semibold mb-1 ${section.color}`}>{section.label}</div>
              {form[section.key].map((rule, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <Input value={rule} onChange={e => updateField(section.key, i, e.target.value)} className="h-8 bg-secondary text-xs flex-1" placeholder={`Règle ${i + 1}`} />
                  <Button size="sm" variant="ghost" onClick={() => removeField(section.key, i)} className="h-8 px-2 text-destructive">✕</Button>
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => addField(section.key)} className="text-xs h-7 text-muted-foreground">+ Ajouter règle</Button>
            </div>
          ))}

          <div>
            <div className="text-xs font-semibold mb-1 text-purple-400">Checklist Pre-Trade</div>
            {form.checklist.map((c, i) => (
              <div key={i} className="flex gap-2 mb-1 items-center">
                <Input value={c.item} onChange={e => { const arr = [...form.checklist]; arr[i] = { ...arr[i], item: e.target.value }; setForm({ ...form, checklist: arr }); }} className="h-8 bg-secondary text-xs flex-1" placeholder={`Checklist item ${i + 1}`} />
                <label className="flex items-center gap-1 text-[10px] text-muted-foreground"><input type="checkbox" checked={c.required} onChange={e => { const arr = [...form.checklist]; arr[i] = { ...arr[i], required: e.target.checked }; setForm({ ...form, checklist: arr }); }} /> Req.</label>
                <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, checklist: form.checklist.filter((_, idx) => idx !== i) })} className="h-8 px-2 text-destructive">✕</Button>
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, checklist: [...form.checklist, { item: '', required: true }] })} className="text-xs h-7 text-muted-foreground">+ Ajouter item</Button>
          </div>

          <Textarea placeholder="Notes additionnelles..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="bg-secondary text-xs" rows={2} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => savePlan.mutate(form)} disabled={savePlan.isPending || !form.name}>{editing ? 'Mettre à jour' : 'Créer le plan'}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Annuler</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {plans.length === 0 && !showForm && (
          <div className="card-trading text-center py-12 text-xs text-muted-foreground"><Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />Créez votre premier plan de trading structuré</div>
        )}
        {plans.map(plan => {
          const review = aiReview[plan.id];
          const entryCount = plan.entry_rules?.filter(r => r?.trim()).length || 0;
          const exitCount = plan.exit_rules?.filter(r => r?.trim()).length || 0;
          const riskCount = plan.risk_rules?.filter(r => r?.trim()).length || 0;
          const checklistCount = plan.checklist?.filter(c => c?.item?.trim()).length || 0;
          return (
            <div key={plan.id} className={`card-trading border ${plan.status === 'active' ? 'border-primary/30' : plan.status === 'paused' ? 'border-yellow-400/30' : 'border-border'}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${plan.status === 'active' ? 'bg-primary/20 text-primary' : plan.status === 'paused' ? 'bg-yellow-400/20 text-yellow-400' : plan.status === 'archived' ? 'bg-muted text-muted-foreground' : 'bg-blue-400/20 text-blue-400'}`}>{plan.status.toUpperCase()}</span>
                <span className="font-bold">{plan.name}</span>
                <span className="text-xs text-muted-foreground">{plan.strategy} · {plan.timeframe} · {plan.session}</span>
                <div className="flex gap-3 text-[10px] text-muted-foreground ml-auto">
                  <span>Entry: <strong className="text-primary">{entryCount}</strong></span>
                  <span>Exit: <strong className="text-yellow-400">{exitCount}</strong></span>
                  <span>Risk: <strong className="text-destructive">{riskCount}</strong></span>
                  <span>Check: <strong className="text-purple-400">{checklistCount}</strong></span>
                </div>
                {review && <span className={`text-sm font-bold ${gradeColor[review.grade]}`}>{review.grade}</span>}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                <div className="p-1.5 rounded bg-secondary/50 text-center"><div className="text-[10px] text-muted-foreground">Max trades/jour</div><div className="font-mono font-bold">{plan.max_trades_per_day}</div></div>
                <div className="p-1.5 rounded bg-secondary/50 text-center"><div className="text-[10px] text-muted-foreground">Risque/trade</div><div className="font-mono font-bold text-destructive">{plan.risk_per_trade}%</div></div>
                <div className="p-1.5 rounded bg-secondary/50 text-center"><div className="text-[10px] text-muted-foreground">Min R:R</div><div className="font-mono font-bold text-blue-400">{plan.min_rr}:1</div></div>
                <div className="p-1.5 rounded bg-secondary/50 text-center"><div className="text-[10px] text-muted-foreground">Max perte jour</div><div className="font-mono font-bold text-destructive">{plan.max_daily_loss}%</div></div>
              </div>

              {(plan.entry_rules?.length > 0 || plan.exit_rules?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-xs">
                  <div>{plan.entry_rules?.filter(r => r?.trim()).map((r, i) => <div key={i} className="text-muted-foreground">✓ {r}</div>)}</div>
                  <div>{plan.exit_rules?.filter(r => r?.trim()).map((r, i) => <div key={i} className="text-muted-foreground">→ {r}</div>)}</div>
                  <div>{plan.risk_rules?.filter(r => r?.trim()).map((r, i) => <div key={i} className="text-muted-foreground">⚠ {r}</div>)}</div>
                </div>
              )}

              {review && (
                <div className="mt-3 p-3 rounded border border-blue-400/20 bg-blue-400/5 space-y-2">
                  <div className="flex items-center gap-2"><span className={`text-lg font-bold ${gradeColor[review.grade]}`}>{review.grade}</span><span className="text-xs text-muted-foreground">Complétude: {review.completeness}%</span></div>
                  <p className="text-xs text-muted-foreground italic">{review.verdict}</p>
                  {review.gaps?.length > 0 && <div className="text-xs"><span className="text-yellow-400">Gaps: </span><span className="text-muted-foreground">{review.gaps.join(', ')}</span></div>}
                  {review.improvements?.length > 0 && <div className="text-xs"><span className="text-primary">Améliorations: </span><span className="text-muted-foreground">{review.improvements.join(', ')}</span></div>}
                </div>
              )}

              <div className="flex gap-2 mt-3 justify-end">
                <Button size="sm" variant="ghost" onClick={() => aiAnalyze(plan)} disabled={loadingAI === plan.id} className="text-xs h-7 gap-1"><Brain className={`w-3 h-3 ${loadingAI === plan.id ? 'animate-spin' : ''}`} />Analyse IA</Button>
                {plan.status !== 'active' && <Button size="sm" variant="ghost" onClick={() => updateStatus(plan, 'active')} className="text-xs h-7 gap-1 text-primary"><Play className="w-3 h-3" />Activer</Button>}
                {plan.status === 'active' && <Button size="sm" variant="ghost" onClick={() => updateStatus(plan, 'paused')} className="text-xs h-7 gap-1 text-yellow-400"><Pause className="w-3 h-3" />Pause</Button>}
                <Button size="sm" variant="ghost" onClick={() => updateStatus(plan, 'archived')} className="text-xs h-7 text-muted-foreground"><Archive className="w-3 h-3" /></Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}