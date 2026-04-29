// Système de notifications global Ghost Trader
// Gère les notifs navigateur + in-app store

const listeners = [];
let notifStore = [];

export const NotifTypes = {
  SIGNAL: 'signal',
  TRADE: 'trade',
  NEWS: 'news',
  UPDATE: 'update',
  DRAWDOWN: 'drawdown',
  PAYOUT: 'payout',
  SYSTEM: 'system',
  COUNCIL: 'council',
};

export const notifIcons = {
  signal: '📡',
  trade: '⚡',
  news: '📰',
  update: '🔔',
  drawdown: '🚨',
  payout: '💰',
  system: '⚙️',
  council: '🏛️',
};

export function requestPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function pushNotification({ type = 'system', title, body, urgent = false }) {
  const notif = {
    id: Date.now(),
    type,
    title,
    body,
    urgent,
    timestamp: new Date(),
    read: false,
  };

  notifStore = [notif, ...notifStore].slice(0, 50); // max 50
  listeners.forEach(fn => fn([...notifStore]));

  // Browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`${notifIcons[type]} ${title}`, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: type,
      requireInteraction: urgent,
    });
  }

  return notif;
}

export function subscribe(fn) {
  listeners.push(fn);
  fn([...notifStore]);
  return () => {
    const i = listeners.indexOf(fn);
    if (i > -1) listeners.splice(i, 1);
  };
}

export function markAllRead() {
  notifStore = notifStore.map(n => ({ ...n, read: true }));
  listeners.forEach(fn => fn([...notifStore]));
}

export function getUnreadCount() {
  return notifStore.filter(n => !n.read).length;
}

// Simulate initial notifications on load
setTimeout(() => {
  pushNotification({ type: NotifTypes.SYSTEM, title: 'Ghost Trader initialisé', body: 'Système prêt — Phase Backtest Local active' });
  pushNotification({ type: NotifTypes.UPDATE, title: 'Stratégie v1.0 active', body: 'Fusion ICT/SMC + Footprint + Market Profile chargée' });
}, 1000);