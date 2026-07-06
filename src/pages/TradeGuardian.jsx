import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Brain, Zap, TrendingUp, Calendar, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const RULES = [
  { id: 'kill_switch', name: 'Kill Switch activé', weight: 100, desc: 'Arrêt d\'urgence activé — Tout trading suspendu' },
  { id: 'daily_loss', name: 'Perte journalière > limite', weight: 90, desc: 'PnL du jour dépasse la limite de perte' },
  { id: 'drawdown', name: 'Drawdown > 80% limite', weight: 85, desc: 'Drawdown proche de la limite propfirm' },
  { id: 'overtrade', name: 'Overtrading détecté', weight: 70, desc: 'Plus de trades que prévu' },
  { id: 'revenge', name: 'Revenge trading', weight: 80, desc: 'Trade de revanche après une perte' },
  { id: 'no_plan', name: 'Pas de plan de trading', weight: 60, desc: 'Aucun plan actif pour la session' },
  { id: 'news_block', name: 'News à haut impact imminent', weight: 75, desc: 'Événement à haut impact dans 30 min' },
  { id: 'tilt', name: 'Tilt psychologique', weight: 85, desc: 'Signaux de tilt détectés' },
  { id: 'late_session', name: 'Fin de session', weight: 40, desc: 'Trading en dehors des heures optimales' },
  { id: 'consecutive_losses', name: '3 pertes consécutives', weight: 65, desc: 'Série de pertes — Risque de tilt' },
  { id: 'fomo', name: 'FOMO élevé', weight: 55, desc: 'Niveau FOMO psychologique élevé' },
  { id: 'fatigue', name: 'Fatigue élevée', weight: 50, desc: 'Niveau de fatigue psychologique élevé' },
];

export default function TradeGuardian() {
  const [overrides, setOverrides] = useState({});
  const [aiAdvice, setAiAdvice] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const { data: trades = [] } = useQuery({ queryKey: ['guardian-trades'], queryFn: () => base44.entities.Trade.list('-entry_time', 100) });
  const { data: accounts = [] } = useQuery({ queryKey: ['guardian-accounts'], queryFn: () => base44.entities.TradingAccount.list() });
  const { data: news = [] } = useQuery({ queryKey: ['guardian-news'], queryFn: () => base44.entities.NewsEvent.list('-event_time', 20) });
  const { data: psych = [] } = useQuery({ queryKey: ['guardian-psych'], queryFn: () => base44.entities.PsychologyEntry.list('-date', 7) });
  const { data: plans = [] } = useQuery({ queryKey: ['guardian-plans'], queryFn: () => base44.entities.TradingPlan.list('-created_date', 10) });

  const ruleStates = useMemo(() => {
    const states = {};
    const today = new Date().toISOString().slice(0, 10);
    const todayTrades = trades.filter(t => t.entry_time?.slice(0, 10) === today);
    const todayPnl = todayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const activeAccount = accounts.find(a => a.status === 'active');
    const recentLosses = trades.slice(0, 3).filter(t => t.result === 'loss').length >= 3;
    const activePlan = plans.find(p => p.status === 'active');
    const recentPsych = psych[0];
    const upcomingNews = news.find(n => {
      const diff = new Date(n.event_time).getTime() - Date.now();
      return diff > 0 && diff < 30 * 60 * 1000 && (n.impact === 'high' || n.impact === 'critical');
    });
    const currentHour = new Date().getUTCHours();
    const lateSession = currentHour < 7 || currentHour > 21;

    states.kill_switch = activeAccount?.status === 'blown';
    states.daily_loss = activeAccount?.daily_drawdown_limit > 0 && todayPnl < -(activeAccount.daily_drawdown_limit * activeAccount.account_size / 100);
    states.drawdown = activeAccount && activeAccount.max_drawdown_limit > 0 && activeAccount.current_balance < activeAccount.account_size * (1 - activeAccount.max_drawdown_limit / 100 * 0.8);
    states.overtrade = activePlan ? todayTrades.length > activePlan.max_trades_per_day : todayTrades.length > 5;
    states.revenge = recentPsych?.revenge_trading || false;
    states.no_plan = !activePlan;
    states.news_block = !!upcomingNews;
    states.tilt = recentPsych?.mood === 'tilt';
    states.late_session = lateSession;
    states.consecutive_losses = recentLosses;
    states.fomo = (recentPsych?.fomo_level || 0) >= 6;
    states.fatigue = (recentPsych?.fatigue_level || 0) >= 7;

    return states;
  }, [trades, accounts, news, psych, plans]);

  const activeViolations = RULES.filter(r => ruleStates[r.id] && !overrides[r.id]);
  const overriddenRules = RULES.filter(r => ruleStates[r.id] && overrides[r.id]);
  const allClear = activeViolations.length === 0;

  const riskScore = useMemo(() => {
    let score = 100;
    activeViolations.forEach(v => { score -= v.weight * 0.5; });
    return Math.max(0, Math.round(score));
  }, [activeViolations]);

  const canTrade = allClear && riskScore >= 60;

  const getAIAdvice = async () => {
    setLoadingAI(true);
    const violationsList = activeViolations.map(v => `${v.name}: ${v.desc}`).join(' | ') || 'Aucune violation';
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Gardien de risque trading. Score de risque: ${riskScore}/100. Peut trader: ${canTrade}.
Violations actives: ${violationsList}
Overrides: ${overriddenRules.map(r => r.name).join(', ') || 'Aucun'}
Trades aujourd'hui: ${trades.filter(t => t.entry_time?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length}

Retourne JSON: {"verdict":"<verdict global>","action":"<action immédiate>","psychological":"<aspect psychologique>","risk_management":"<gestion du risque>","checklist":["<item1>","<item2>"]}`,
      response_json_schema: { type: "object", properties: { verdict: { type: "string" }, action: { type: "string" }, psychological: { type: "string" }, risk_management: { type: "string" }, checklist: { type: "array", items: { type: "string" } } } }
    });
    setAiAdvice(res); setLoadingAI(false);
  };

  const toggleOverride = (id) => setOverrides(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" />Trade Guardian</h1>
          <p className="text-xs text-muted-foreground">Protection temps réel · Règles automatiques · Score de risque · Override tracking</p>
        </div>
        <Button size="sm" onClick={getAIAdvice} disabled={loadingAI} className="gap-1 text-xs"><Brain className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />Conseil IA</Button>
      </div>

      <div className={`card-trading border-2 ${canTrade ? 'border-primary bg-primary/5' : 'border-destructive bg-destructive/5'} flex items-center gap-4`}>
        {canTrade ? <CheckCircle2 className="w-8 h-8 text-primary" /> : <AlertTriangle className="w-8 h-8 text-destructive" />}
        <div className="flex-1">
          <div className={`text-lg font-bold ${canTrade ? 'text-primary' : 'text-destructive'}`}>{canTrade ? 'TRADING AUTORISÉ' : 'TRADING BLOQUÉ'}</div>
          <div className="text-xs text-muted-foreground">{canTrade ? 'Toutes les règles sont respectées — Vous pouvez trader' : `${activeViolations.length} violation(s) active(s) — Trading suspendu`}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold font-mono text-foreground">{riskScore}</div>
          <div className="text-[10px] text-muted-foreground">Risk Score</div>
        </div>
      </div>

      {activeViolations.length > 0 && (
        <div className="card-trading border border-destructive/30">
          <div className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Violations Actives ({activeViolations.length})</div>
          <div className="space-y-2">
            {activeViolations.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-2 rounded bg-destructive/5 border border-destructive/20">
                <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-destructive">{v.name}</div>
                  <div className="text-[10px] text-muted-foreground">{v.desc}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-destructive/20 text-destructive font-mono">-{v.weight}</span>
                <Button size="sm" variant="ghost" onClick={() => toggleOverride(v.id)} className="text-[10px] h-6 text-muted-foreground hover:text-yellow-400">Override</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {overriddenRules.length > 0 && (
        <div className="card-trading border border-yellow-400/30">
          <div className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Règles Overridées ({overriddenRules.length})</div>
          <div className="space-y-1">
            {overriddenRules.map(r => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <span className="text-yellow-400">⚠️</span>
                <span className="text-muted-foreground">{r.name}</span>
                <Button size="sm" variant="ghost" onClick={() => toggleOverride(r.id)} className="ml-auto text-[10px] h-6 text-primary">Réactiver</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-trading">
        <div className="text-sm font-semibold mb-3">État des Règles de Protection</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {RULES.map(r => {
            const active = ruleStates[r.id];
            const overridden = overrides[r.id];
            return (
              <div key={r.id} className={`flex items-center gap-2 p-2 rounded border text-xs ${active ? (overridden ? 'border-yellow-400/30 bg-yellow-400/5' : 'border-destructive/20 bg-destructive/5') : 'border-border bg-secondary/20'}`}>
                {active ? (overridden ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" /> : <XCircle className="w-3.5 h-3.5 text-destructive" />) : <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                <span className={active ? 'text-foreground' : 'text-muted-foreground'}>{r.name}</span>
                {active && <span className={`ml-auto text-[9px] px-1.5 rounded font-mono ${overridden ? 'text-yellow-400' : 'text-destructive'}`}>{overridden ? 'OVR' : `-${r.weight}`}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {aiAdvice && (
        <div className="card-trading border border-yellow-400/30 bg-yellow-400/5 space-y-3">
          <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-yellow-400" /><span className="text-sm font-semibold">Conseil Guardian IA</span></div>
          <p className="text-xs text-muted-foreground italic">{aiAdvice.verdict}</p>
          <div className="p-2 bg-destructive/5 border border-destructive/20 rounded text-xs"><span className="text-destructive font-semibold">🚨 Action: </span><span className="text-muted-foreground">{aiAdvice.action}</span></div>
          <div className="p-2 bg-purple-400/5 border border-purple-400/20 rounded text-xs"><span className="text-purple-400 font-semibold">🧠 Psychologie: </span><span className="text-muted-foreground">{aiAdvice.psychological}</span></div>
          <div className="p-2 bg-blue-400/5 border border-blue-400/20 rounded text-xs"><span className="text-blue-400 font-semibold">🛡 Risque: </span><span className="text-muted-foreground">{aiAdvice.risk_management}</span></div>
          {aiAdvice.checklist?.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-primary font-semibold uppercase">✅ Checklist avant reprise</div>
              {aiAdvice.checklist.map((c, i) => <div key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-primary/30">☐ {c}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}