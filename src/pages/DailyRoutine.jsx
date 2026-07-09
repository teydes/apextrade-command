import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClipboardList, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';

const DEFAULT_CHECKLIST = [
  'Check economic calendar for high-impact news',
  'Review overnight market action',
  'Check open positions and pending orders',
  'Verify account balance and risk limits',
  'Identify key support/resistance levels',
  'Check session timing (London/NY open)',
  'Review trading plan and daily goals',
  'Set mental state (calm, focused)',
  'Confirm internet/platform stability',
  'Review yesterday\'s mistakes',
];

export default function DailyRoutine() {
  const [items, setItems] = useState(DEFAULT_CHECKLIST);
  const [checked, setChecked] = useState({});
  const [newItem, setNewItem] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const saved = localStorage.getItem(`routine_${date}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setItems(parsed.items || DEFAULT_CHECKLIST);
      setChecked(parsed.checked || {});
    } else {
      setItems(DEFAULT_CHECKLIST);
      setChecked({});
    }
  }, [date]);

  const toggle = (idx) => {
    const newChecked = { ...checked, [idx]: !checked[idx] };
    setChecked(newChecked);
    localStorage.setItem(`routine_${date}`, JSON.stringify({ items, checked: newChecked }));
  };

  const addItem = () => {
    if (newItem) {
      const newItems = [...items, newItem];
      setItems(newItems);
      setNewItem('');
      localStorage.setItem(`routine_${date}`, JSON.stringify({ items: newItems, checked }));
    }
  };

  const removeItem = (idx) => {
    const newItems = items.filter((_, i) => i !== idx);
    setItems(newItems);
    const newChecked = {};
    Object.keys(checked).forEach(k => { if (+k !== idx) newChecked[+k > idx ? +k - 1 : k] = checked[k]; });
    setChecked(newChecked);
    localStorage.setItem(`routine_${date}`, JSON.stringify({ items: newItems, checked: newChecked }));
  };

  const completed = Object.values(checked).filter(Boolean).length;
  const progress = items.length > 0 ? (completed / items.length) * 100 : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <ClipboardList className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Daily Routine Checklist</h1><p className="text-sm text-muted-foreground">Routine pre-market quotidienne</p></div>
      </div>

      <Card className="card-trading">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
            <div className="ml-auto text-right">
              <div className="text-2xl font-mono font-bold text-primary">{progress.toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">{completed}/{items.length} complété</div>
            </div>
          </div>
          <div className="progress-bar mt-3"><div className="progress-bar-fill bg-primary" style={{ width: `${progress}%` }}></div></div>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Checklist du jour</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded bg-secondary/50 row-hover">
              <Checkbox checked={checked[idx] || false} onCheckedChange={() => toggle(idx)} />
              <span className={`flex-1 text-sm ${checked[idx] ? 'line-through text-muted-foreground' : ''}`}>{item}</span>
              {checked[idx] ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
              <button onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4 text-danger-red" /></button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Ajouter un item..." onKeyDown={e => e.key === 'Enter' && addItem()} />
            <Button onClick={addItem}><Plus className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {progress === 100 && (
        <Card className="card-trading glow-green">
          <CardContent className="py-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-2" />
            <div className="font-bold text-primary text-lg">Routine complète ! Prêt à trader.</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}