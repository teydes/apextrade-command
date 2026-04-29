import { useState, useEffect } from 'react';
import { Bell, BellRing, X, CheckCheck } from 'lucide-react';
import { subscribe, markAllRead, notifIcons, requestPermission } from '@/lib/notifications';

export default function NotificationCenter() {
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    requestPermission();
    const unsub = subscribe(setNotifs);
    return unsub;
  }, []);

  const unread = notifs.filter(n => !n.read).length;

  const typeColor = {
    signal: 'text-primary border-primary/30',
    trade: 'text-blue-400 border-blue-400/30',
    news: 'text-yellow-400 border-yellow-400/30',
    update: 'text-purple-400 border-purple-400/30',
    drawdown: 'text-red-400 border-red-400/30',
    payout: 'text-green-400 border-green-400/30',
    system: 'text-muted-foreground border-border',
    council: 'text-yellow-400 border-yellow-400/30',
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(p => !p); if (!open && unread > 0) markAllRead(); }}
        className="relative p-1.5 rounded-md hover:bg-secondary transition-colors"
      >
        {unread > 0 ? <BellRing className="w-4 h-4 text-yellow-400" /> : <Bell className="w-4 h-4 text-muted-foreground" />}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-80 bg-card border border-border rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-semibold">Notifications</span>
            <div className="flex items-center gap-2">
              <button onClick={markAllRead} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                <CheckCheck className="w-3 h-3" /> Tout lire
              </button>
              <button onClick={() => setOpen(false)}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /></button>
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
            {notifs.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-6">Aucune notification</div>
            )}
            {notifs.map(n => (
              <div key={n.id} className={`px-3 py-2.5 border-b border-border/50 flex gap-2.5 ${!n.read ? 'bg-secondary/30' : ''}`}>
                <span className="text-sm flex-shrink-0">{notifIcons[n.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold ${typeColor[n.type]?.split(' ')[0] || 'text-foreground'}`}>{n.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{n.body}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(n.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {n.urgent && <span className="text-[10px] text-red-400 font-bold self-start">URGENT</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}