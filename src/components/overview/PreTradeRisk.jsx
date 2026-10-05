import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calculator, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { barColor } from '@/lib/portfolio';

const MiniBar = ({ label, before, after }) => (
  <div>
    <div className="flex justify-between text-[10px] mb-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">
        <span className="text-muted-foreground">{before.toFixed(0)}%</span>
        <span className={after > before + 0.5 ? 'text-red-400' : 'text-green-400'}> → {after.toFixed(0)}%</span>
      </span>
    </div>
    <div className="h-1.5 rounded bg-secondary overflow-hidden relative">
      <div className="h-full rounded transition-all" style={{ width: `${Math.min(100, after)}%`, background: barColor(after) }} />
    </div>
  </div>
);

export default function PreTradeRisk({ stats }) {
  const [accId, setAccId] = useState('');
  const [loss, setLoss] = useState('');
  const row = stats.find((x) => x.account.id === accId) || stats[0];
  const lossNum = parseFloat(loss) || 0;

  let after = null;
  if (row) {
    const { account, s } = row;
    const balance = (account.current_balance || 0) - lossNum;
    const dailyPnl = s.dailyPnl - lossNum;
    const dailyLimit = account.daily_drawdown_limit || 0;
    const dailyUsed = dailyLimit > 0 ? Math.min(100, (Math.max(0, -dailyPnl) / dailyLimit) * 100) : 0;
    const maxLimit = account.max_drawdown_limit || 0;
    const ddUsed = maxLimit > 0 ? Math.min(100, ((s.currentDD + lossNum) / maxLimit) * 100) : 0;
    const totalPnl = s.totalPnl - lossNum;
    const consistency = totalPnl > 0 ? (Math.min(Math.max(dailyPnl, 0), Math.max(totalPnl, 0)) / totalPnl) * 100 : 0;
    const worst = Math.max(dailyUsed, ddUsed);
    after = { balance, dailyUsed, ddUsed, consistency, worst, rule: account.consistency_rule || 0 };
  }

  const verdict = !after || lossNum <= 0
    ? null
    : after.worst >= 100
      ? { level: 'danger', icon: XCircle, text: 'POSITION INTERDITE — cette perte franchit une limite de drawdown.', cls: 'text-red-400 border-red-500/40' }
      : after.worst >= 80
        ? { level: 'warn', icon: AlertTriangle, text: 'RISQUE ÉLEVÉ — cette perte vous amène à ≥80% d\'une limite.', cls: 'text-yellow-400 border-yellow-500/40' }
        : { level: 'ok', icon: CheckCircle2, text: 'POSITION AUTORISÉE — marges de drawdown conservées après perte.', cls: 'text-green-400 border-green-500/40' };

  if (!row) return null;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground"><Calculator className="w-4 h-4 text-primary" />Simulateur de risque pré-position</div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={row.account.id} onValueChange={setAccId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {stats.map((x) => <SelectItem key={x.account.id} value={x.account.id}>{x.account.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" min="0" placeholder="Perte potentielle (€)" value={loss} onChange={(e) => setLoss(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="flex gap-1.5">
          {[0.5, 1, 2].map((p) => (
            <Button key={p} size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => setLoss(String(Math.round((row.account.current_balance || 0) * p / 100)))}>
              {p}% du compte
            </Button>
          ))}
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setLoss('')}>Reset</Button>
        </div>
        {verdict && (
          <div className={`flex items-center gap-2 text-xs font-bold border rounded-md p-2 ${verdict.cls}`}>
            <verdict.icon className="w-4 h-4 shrink-0" />{verdict.text}
          </div>
        )}
        {after && lossNum > 0 && (
          <div className="space-y-2">
            <MiniBar label="DD journalier" before={row.s.dailyUsedPct} after={after.dailyUsed} />
            <MiniBar label="DD max" before={row.s.ddUsedPct} after={after.ddUsed} />
            <MiniBar label="Consistance (jour/total)" before={row.s.consistencyPct} after={after.consistency} />
            <div className="text-[10px] text-muted-foreground">
              Solde après perte: <span className="font-mono text-foreground">{Math.round(after.balance).toLocaleString()}€</span>
            </div>
          </div>
        )}
        {lossNum <= 0 && <div className="text-[10px] text-muted-foreground">Saisissez une perte potentielle pour simuler son impact sur les limites avant d'exécuter le trade.</div>}
      </CardContent>
    </Card>
  );
}