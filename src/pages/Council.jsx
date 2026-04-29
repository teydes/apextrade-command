import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Brain, TrendingUp, Shield, Zap, Send, RefreshCw, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { pushNotification, NotifTypes } from '@/lib/notifications';
import ReactMarkdown from 'react-markdown';

const AGENTS = [
  { id: 'ict', name: 'ICT/SMC', emoji: '🧠', color: 'text-primary', border: 'border-primary/30', bg: 'bg-primary/10' },
  { id: 'footprint', name: 'Footprint', emoji: '📊', color: 'text-blue-400', border: 'border-blue-400/30', bg: 'bg-blue-400/10' },
  { id: 'profile', name: 'Market Profile', emoji: '📈', color: 'text-purple-400', border: 'border-purple-400/30', bg: 'bg-purple-400/10' },
  { id: 'risk', name: 'Risk MFF', emoji: '🛡️', color: 'text-red-400', border: 'border-red-400/30', bg: 'bg-red-400/10' },
];

const QUICK_PROMPTS = [
  'Analyse les 5 derniers trades — patterns de pertes ?',
  'Meilleurs setups ICT+Footprint+Profile sur session NY ?',
  'Propose une mise à jour de stratégie v1.1 basée sur les résultats',
  'Pourquoi les trades SHORT NQ ont un taux d\'échec plus élevé ?',
  'Conflits ICT vs Footprint sur les entrées de la semaine ?',
  'Quels trades auraient pu être évités avec la règle MFF consistance 30% ?',
];

export default function Council() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stratVersion, setStratVersion] = useState('v1.0');
  const [updates, setUpdates] = useState([
    { version: 'v1.0', date: '2026-04-29', summary: 'Stratégie fusionnée ICT+Footprint+Market Profile initialisée', active: true },
  ]);
  const bottomRef = useRef(null);

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadConversations = async () => {
    const convs = await base44.agents.listConversations({ agent_name: 'trading_council' });
    setConversations(convs || []);
    if (convs?.length > 0) selectConv(convs[0].id);
  };

  const selectConv = async (id) => {
    const conv = await base44.agents.getConversation(id);
    setActiveConvId(id);
    setMessages(conv.messages || []);
    base44.agents.subscribeToConversation(id, (data) => {
      setMessages(data.messages || []);
      setLoading(false);
    });
  };

  const startNewSession = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: 'trading_council',
      metadata: { name: `Conseil ${new Date().toLocaleDateString('fr-FR')}` }
    });
    setActiveConvId(conv.id);
    setMessages([]);
    setConversations(p => [conv, ...p]);
    base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
      setLoading(false);
    });
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setLoading(true);

    let convId = activeConvId;
    if (!convId) {
      const conv = await base44.agents.createConversation({ agent_name: 'trading_council', metadata: { name: `Conseil ${new Date().toLocaleDateString('fr-FR')}` } });
      convId = conv.id;
      setActiveConvId(conv.id);
      setConversations(p => [conv, ...p]);
      base44.agents.subscribeToConversation(conv.id, (data) => { setMessages(data.messages || []); setLoading(false); });
    }

    setMessages(p => [...p, { role: 'user', content: msg }]);
    const conv = await base44.agents.getConversation(convId);
    await base44.agents.addMessage(conv, { role: 'user', content: msg });

    // Notify
    pushNotification({ type: NotifTypes.COUNCIL, title: 'Conseil en délibération', body: msg.substring(0, 60) });

    // Check for version update trigger
    if (msg.toLowerCase().includes('mise à jour') || msg.toLowerCase().includes('update stratégie')) {
      setTimeout(() => {
        const parts = stratVersion.replace('v', '').split('.');
        const newV = `v${parts[0]}.${parseInt(parts[1] || 0) + 1}`;
        setStratVersion(newV);
        setUpdates(p => [{ version: newV, date: new Date().toLocaleDateString('fr-FR'), summary: msg.substring(0, 70), active: true }, ...p.map(u => ({ ...u, active: false }))]);
        pushNotification({ type: NotifTypes.UPDATE, title: `Stratégie mise à jour ${newV}`, body: 'Le conseil a proposé une nouvelle révision de stratégie', urgent: false });
      }, 4000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-yellow-400" />
          <div>
            <h1 className="text-xl font-bold">Conseil de Trading IA</h1>
            <p className="text-xs text-muted-foreground">4 agents · Débat salle de réunion · Stratégie fusionnée ICT+Footprint+Market Profile</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-yellow-400/10 text-yellow-400 px-2 py-1 rounded border border-yellow-400/20">
            Stratégie {stratVersion}
          </span>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={startNewSession}>
            <RefreshCw className="w-3 h-3" /> Nouvelle Session
          </Button>
        </div>
      </div>

      {/* Agents */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {AGENTS.map(a => (
          <div key={a.id} className={`card-trading flex items-center gap-2 border ${a.border}`}>
            <div className={`w-8 h-8 rounded-lg ${a.bg} flex items-center justify-center text-base`}>{a.emoji}</div>
            <div>
              <div className={`text-xs font-bold ${a.color}`}>{a.name}</div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="status-dot active" /> En ligne
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar : sessions + versions */}
        <div className="card-trading space-y-2">
          <div className="text-xs font-semibold">Sessions</div>
          {conversations.length === 0 && <div className="text-xs text-muted-foreground py-2">Aucune session</div>}
          {conversations.map(c => (
            <button key={c.id} onClick={() => selectConv(c.id)}
              className={`w-full text-left p-2 rounded text-xs transition-all ${activeConvId === c.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-secondary/50'}`}>
              <div className="font-medium truncate">{c.metadata?.name || 'Session'}</div>
              <div className="text-muted-foreground">{c.created_date ? new Date(c.created_date).toLocaleDateString('fr-FR') : ''}</div>
            </button>
          ))}

          <div className="border-t border-border pt-2 mt-2">
            <div className="text-xs font-semibold mb-2 flex items-center gap-1">
              <Bell className="w-3 h-3 text-yellow-400" /> Versions Stratégie
            </div>
            {updates.map(u => (
              <div key={u.version} className={`p-2 rounded text-[10px] mb-1 ${u.active ? 'bg-yellow-400/10 border border-yellow-400/20' : 'bg-secondary/30'}`}>
                <div className="flex justify-between mb-0.5">
                  <span className={`font-bold ${u.active ? 'text-yellow-400' : 'text-muted-foreground'}`}>{u.version}</span>
                  <span className="text-muted-foreground">{u.date}</span>
                </div>
                <div className="text-muted-foreground truncate">{u.summary}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-3 card-trading flex flex-col" style={{ minHeight: 500 }}>
          <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1" style={{ maxHeight: 380 }}>
            {messages.length === 0 && (
              <div className="text-center py-6">
                <div className="text-5xl mb-3">🏛️</div>
                <div className="text-sm font-medium mb-1">Salle de Réunion Virtuelle</div>
                <div className="text-xs text-muted-foreground mb-4">Les 4 agents débattent de chaque trade pour améliorer la stratégie fusionnée.</div>
                <div className="grid grid-cols-1 gap-2 max-w-lg mx-auto">
                  {QUICK_PROMPTS.map((p, i) => (
                    <button key={i} onClick={() => sendMessage(p)}
                      className="text-left p-2 rounded bg-secondary/40 hover:bg-secondary text-xs text-muted-foreground hover:text-foreground border border-border transition-all">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.filter(m => m.content).map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role !== 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-yellow-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">⚡</div>
                )}
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-xs ${m.role === 'user' ? 'bg-primary/20 text-foreground' : 'bg-muted border border-border'}`}>
                  {m.role === 'user' ? <p>{m.content}</p> : (
                    <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h3]:text-primary [&_h3]:text-xs [&_strong]:text-foreground [&_p]:my-1">
                      {m.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-yellow-400/10 flex items-center justify-center text-sm">⚡</div>
                <div className="bg-muted border border-border rounded-xl px-4 py-3 text-xs text-muted-foreground animate-pulse">
                  Les agents délibèrent en salle de réunion...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
            {QUICK_PROMPTS.slice(0, 3).map((p, i) => (
              <button key={i} onClick={() => sendMessage(p)}
                className="shrink-0 text-xs px-2 py-1 rounded bg-secondary/60 text-muted-foreground hover:text-foreground border border-border">
                {p.substring(0, 30)}...
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Demande au conseil... (ex: Pourquoi le trade SHORT NQ 17500 a échoué ?)"
              className="bg-secondary border-border text-xs resize-none h-16" />
            <Button className="self-end h-10 px-3" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}