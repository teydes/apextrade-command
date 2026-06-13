import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Bot, Send, Plus, Trash2, MessageSquare, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

export default function GhostCoach() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConv) {
      const unsub = base44.agents.subscribeToConversation(activeConv.id, (data) => {
        setMessages(data.messages || []);
      });
      return () => unsub();
    }
  }, [activeConv?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    const convs = await base44.agents.listConversations({ agent_name: 'ghost_coach' });
    setConversations(convs || []);
    if (convs?.length > 0 && !activeConv) {
      selectConv(convs[0]);
    }
  };

  const selectConv = async (conv) => {
    const full = await base44.agents.getConversation(conv.id);
    setActiveConv(full);
    setMessages(full.messages || []);
  };

  const newConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: 'ghost_coach',
      metadata: { name: `Session ${new Date().toLocaleDateString('fr-FR')}` }
    });
    await loadConversations();
    selectConv(conv);
  };

  const deleteConv = async (convId, e) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (activeConv?.id === convId) { setActiveConv(null); setMessages([]); }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    let conv = activeConv;
    if (!conv) {
      conv = await base44.agents.createConversation({ agent_name: 'ghost_coach', metadata: { name: `Session ${new Date().toLocaleDateString('fr-FR')}` } });
      setActiveConv(conv);
      await loadConversations();
    }
    const text = input.trim();
    setInput('');
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    await base44.agents.addMessage(conv, { role: 'user', content: text });
    setSending(false);
  };

  const QUICK_PROMPTS = [
    'Analyse mes trades du jour',
    'Quel est mon win rate cette semaine ?',
    'Valide ce setup : LONG NQ OB H1 + FVG 5m session NY Open',
    'Conseils pour améliorer ma discipline',
    'Règles MFF que je dois respecter aujourd\'hui',
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar conversations */}
      <div className="w-56 flex flex-col gap-2 flex-shrink-0">
        <Button size="sm" className="gap-1 w-full" onClick={newConversation}>
          <Plus className="w-3.5 h-3.5" />Nouvelle session
        </Button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">
              <Bot className="w-6 h-6 mx-auto mb-1 opacity-30" />
              Démarrez une session
            </div>
          )}
          {conversations.map(conv => (
            <button key={conv.id} onClick={() => selectConv(conv)}
              className={`w-full text-left p-2 rounded text-xs flex items-center gap-2 transition-all group ${activeConv?.id === conv.id ? 'bg-primary/10 border border-primary/30 text-foreground' : 'bg-secondary/30 border border-transparent hover:border-border text-muted-foreground'}`}>
              <MessageSquare className="w-3 h-3 flex-shrink-0" />
              <span className="flex-1 truncate">{conv.metadata?.name || 'Session'}</span>
              <button onClick={(e) => deleteConv(conv.id, e)} className="opacity-0 group-hover:opacity-100 hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col card-trading p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-3 border-b border-border">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold">Ghost Coach IA</div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="status-dot active" style={{ width: 6, height: 6 }} />
              Expert ICT/SMC · NQ Futures · PropFirm
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 mx-auto mb-3 text-primary opacity-30" />
              <p className="text-sm text-muted-foreground mb-4">Ghost Coach est prêt à vous aider</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_PROMPTS.map((p, i) => (
                  <button key={i} onClick={() => { setInput(p); }}
                    className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-all">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-secondary border border-border rounded-lg px-3 py-2 flex items-center gap-2">
                <Zap className="w-3 h-3 text-primary animate-pulse" />
                <span className="text-xs text-muted-foreground">Ghost Coach analyse...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Posez une question à Ghost Coach... (Entrée pour envoyer)"
              className="bg-secondary border-border text-sm flex-1"
              disabled={sending}
            />
            <Button size="sm" onClick={sendMessage} disabled={!input.trim() || sending} className="px-3">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  if (message.tool_calls?.length > 0 && !message.content) return null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-lg px-3 py-2 ${isUser ? 'bg-primary/20 border border-primary/30' : 'bg-secondary border border-border'}`}>
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <ReactMarkdown className="text-sm prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">{message.content}</ReactMarkdown>
        )}
        {message.tool_calls?.map((tc, i) => {
          const dp = tc.display_projection;
          if (dp?.hide_details && dp?.details_redacted) {
            const label = ['pending','running','in_progress'].includes(tc.status) ? dp.active_label : ['failed','error'].includes(tc.status) ? dp.error_label : dp.label;
            return <div key={i} className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Zap className="w-2.5 h-2.5" />{label}</div>;
          }
          return (
            <div key={i} className="mt-1 text-[10px] text-muted-foreground bg-background/50 rounded px-2 py-1">
              🔧 {tc.name} — {tc.status}
            </div>
          );
        })}
      </div>
    </div>
  );
}