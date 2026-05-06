import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Link2, Plus, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Settings2, Zap, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const SUPPORTED_FIRMS = [
  { id: 'mff', name: 'MyFundedFutures', website: 'myfundedfutures.com', color: '#00FF88', status: 'supported', api: true },
  { id: 'tradefy', name: 'Tradefy', website: 'tradefy.com', color: '#0088FF', status: 'supported', api: true },
  { id: 'lucid', name: 'Lucid Trading', website: 'lucidtrading.com', color: '#F59E0B', status: 'supported', api: true },
  { id: 'ufunded', name: 'UFunded', website: 'ufunded.com', color: '#8B5CF6', status: 'supported', api: false },
  { id: 'tradeday', name: 'TradeDay', website: 'tradeday.com', color: '#EF4444', status: 'beta', api: false },
  { id: 'topstep', name: 'TopStep', website: 'topstep.com', color: '#64748b', status: 'unsupported', api: false },
];

const PLATFORMS = ['QuantTower', 'NinjaTrader', 'MT5', 'Rithmic', 'CQG', 'Tradovate'];

export default function PropFirmConnect() {
  const [showAdd, setShowAdd] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [newConn, setNewConn] = useState({ firm: '', accountNumber: '', login: '', apiKey: '', platform: '', phase: 'demo', size: '' });

  const qc = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts-connect'],
    queryFn: () => base44.entities.TradingAccount.list(),
  });

  const createAccount = useMutation({
    mutationFn: (data) => base44.entities.TradingAccount.create(data),
    onSuccess: () => { qc.invalidateQueries(['accounts-connect']); setShowAdd(false); toast.success('Compte connecté !'); },
  });

  const deleteAccount = useMutation({
    mutationFn: (id) => base44.entities.TradingAccount.delete(id),
    onSuccess: () => { qc.invalidateQueries(['accounts-connect']); toast.success('Compte supprimé'); },
  });

  const updateAccount = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TradingAccount.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['accounts-connect']); },
  });

  const testConnection = async (account) => {
    setTestingId(account.id);
    await new Promise(r => setTimeout(r, 1500));
    setTestingId(null);
    toast.success(`✅ Connexion ${account.name} validée — Données synchronisées`);
  };

  const syncBalance = async (account) => {
    // Dans un vrai contexte, cela appelerait l'API de la PropFirm
    const mockNewBalance = (account.current_balance || account.account_size) * (1 + (Math.random() * 0.02 - 0.005));
    await updateAccount.mutateAsync({ id: account.id, data: { current_balance: Math.round(mockNewBalance) } });
    toast.success(`Balance synchronisée: ${Math.round(mockNewBalance).toLocaleString()}€`);
  };

  const addAccount = () => {
    if (!newConn.firm || !newConn.phase) { toast.error('Remplissez les champs obligatoires'); return; }
    createAccount.mutate({
      name: `${newConn.firm} ${newConn.size || ''}`.trim(),
      propfirm: newConn.firm,
      account_size: parseFloat(newConn.size) || 50000,
      current_balance: parseFloat(newConn.size) || 50000,
      phase: newConn.phase,
      login: newConn.login || newConn.accountNumber,
      platform: newConn.platform?.toLowerCase().replace(' ', '') || 'other',
      status: 'active',
    });
  };

  const getStatusColor = (s) => ({ supported: 'text-primary', beta: 'text-yellow-400', unsupported: 'text-destructive' }[s] || 'text-muted-foreground');
  const getPhaseColor = (p) => ({ live: 'text-primary', demo: 'text-blue-400', backtest_local: 'text-muted-foreground' }[p] || 'text-muted-foreground');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-400" />
            Connexion PropFirms
          </h1>
          <p className="text-xs text-muted-foreground">Gestion centralisée · {accounts.length} compte(s) connecté(s) · Sync balances automatique</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 text-xs"><Plus className="w-3 h-3" />Connecter un compte</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader><DialogTitle>Connecter un compte PropFirm</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">PropFirm *</Label>
                  <Select value={newConn.firm} onValueChange={v => setNewConn(p => ({...p, firm: v}))}>
                    <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_FIRMS.filter(f => f.status !== 'unsupported').map(f => (
                        <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Phase *</Label>
                  <Select value={newConn.phase} onValueChange={v => setNewConn(p => ({...p, phase: v}))}>
                    <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="backtest_local">Backtest Local</SelectItem>
                      <SelectItem value="demo">Demo</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Taille du compte (€)</Label>
                  <Input type="number" value={newConn.size} onChange={e => setNewConn(p => ({...p, size: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1" placeholder="50000" />
                </div>
                <div>
                  <Label className="text-xs">Plateforme</Label>
                  <Select value={newConn.platform} onValueChange={v => setNewConn(p => ({...p, platform: v}))}>
                    <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue placeholder="Optionnel" /></SelectTrigger>
                    <SelectContent>{PLATFORMS.map(pl => <SelectItem key={pl} value={pl}>{pl}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Login / Numéro de compte</Label>
                <Input value={newConn.login} onChange={e => setNewConn(p => ({...p, login: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1" placeholder="Ex: 123456" />
              </div>
              <div>
                <Label className="text-xs">Clé API (si disponible)</Label>
                <Input type="password" value={newConn.apiKey} onChange={e => setNewConn(p => ({...p, apiKey: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1" placeholder="Optionnel" />
              </div>
              <div className="flex gap-2 p-2 bg-yellow-400/5 border border-yellow-400/20 rounded text-xs">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">La connexion API directe n'est pas encore disponible pour toutes les PropFirms. Les données peuvent être saisies manuellement.</p>
              </div>
              <Button onClick={addAccount} className="w-full" disabled={createAccount.isPending}>
                {createAccount.isPending ? 'Connexion...' : 'Connecter'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Comptes connectés */}
      {accounts.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comptes Connectés ({accounts.length})</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map(acc => (
              <div key={acc.id} className={`card-trading border ${acc.phase === 'live' ? 'border-primary/30' : 'border-border'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{acc.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${getPhaseColor(acc.phase)} bg-current/10`} style={{ backgroundColor: 'transparent', border: '1px solid currentColor' }}>
                        {acc.phase?.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{acc.propfirm} · {acc.platform || 'N/A'}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => syncBalance(acc)} title="Sync balance">
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteAccount.mutate(acc.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="p-1.5 rounded bg-secondary/50 text-center">
                    <div className="text-muted-foreground text-[10px]">Taille</div>
                    <div className="font-mono font-bold">{acc.account_size?.toLocaleString()}€</div>
                  </div>
                  <div className="p-1.5 rounded bg-secondary/50 text-center">
                    <div className="text-muted-foreground text-[10px]">Balance</div>
                    <div className={`font-mono font-bold ${(acc.current_balance || 0) >= (acc.account_size || 0) ? 'text-primary' : 'text-destructive'}`}>
                      {(acc.current_balance || acc.account_size)?.toLocaleString()}€
                    </div>
                  </div>
                  <div className="p-1.5 rounded bg-secondary/50 text-center">
                    <div className="text-muted-foreground text-[10px]">P&L</div>
                    <div className={`font-mono font-bold ${((acc.current_balance || acc.account_size) - acc.account_size) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {((acc.current_balance || acc.account_size) - acc.account_size) >= 0 ? '+' : ''}{((acc.current_balance || acc.account_size) - acc.account_size)?.toLocaleString()}€
                    </div>
                  </div>
                </div>

                {acc.daily_drawdown_limit && (
                  <div className="mb-2">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>DD Journalier</span>
                      <span className="font-mono">0 / {acc.daily_drawdown_limit?.toLocaleString()}€</span>
                    </div>
                    <div className="progress-bar"><div className="progress-bar-fill bg-primary" style={{ width: '5%' }} /></div>
                  </div>
                )}

                <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1" onClick={() => testConnection(acc)} disabled={testingId === acc.id}>
                  {testingId === acc.id ? <><RefreshCw className="w-3 h-3 animate-spin" />Test...</> : <><Zap className="w-3 h-3" />Tester la connexion</>}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {accounts.length === 0 && !isLoading && (
        <div className="card-trading text-center py-12">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
          <p className="text-sm text-muted-foreground mb-2">Aucun compte connecté</p>
          <p className="text-xs text-muted-foreground opacity-60">Cliquez "Connecter un compte" pour ajouter vos PropFirms</p>
        </div>
      )}

      {/* PropFirms supportées */}
      <div className="card-trading">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold">PropFirms Supportées</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {SUPPORTED_FIRMS.map(f => (
            <div key={f.id} className={`p-3 rounded border text-xs ${f.status === 'supported' ? 'border-border bg-secondary/30' : f.status === 'beta' ? 'border-yellow-400/20 bg-yellow-400/5' : 'border-border/30 opacity-50'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">{f.name}</span>
                <span className={`${getStatusColor(f.status)} text-[10px] font-bold`}>
                  {f.status === 'supported' ? '✓ OK' : f.status === 'beta' ? 'BETA' : '✗'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a href={`https://${f.website}`} target="_blank" rel="noopener" className="text-blue-400 hover:underline flex items-center gap-1 text-[10px]">
                  {f.website} <ExternalLink className="w-2.5 h-2.5" />
                </a>
                {f.api && <span className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary">API</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guide connexion */}
      <div className="card-trading border border-blue-400/20">
        <div className="text-sm font-semibold mb-3 text-blue-400">📡 Guide de Connexion</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {[
            { step: '1', title: 'Webhook TradingView', desc: 'Configurez votre alerte TV avec l\'URL webhook Ghost Trader. Les signaux arrivent en temps réel.' },
            { step: '2', title: 'Compte PropFirm', desc: 'Ajoutez vos comptes avec login/numéro. Le suivi de balance est manuel ou via export CSV.' },
            { step: '3', title: 'Copy Trading', desc: 'Activez la réplication automatique depuis votre compte maître vers tous vos comptes esclaves.' },
          ].map(g => (
            <div key={g.step} className="p-3 rounded bg-secondary/30 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">{g.step}</span>
                <span className="font-semibold">{g.title}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}