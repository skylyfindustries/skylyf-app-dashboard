export const fmt = (n) => Math.round(n ?? 0).toLocaleString();
export const date = (d) => (d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const day = (d) => (d ? new Date(d).toLocaleDateString([], { dateStyle: 'medium' }) : '—');
export const label = (s) => String(s ?? '').replace('_', ' ');
export const hours = (sec) => `${(sec / 3600).toFixed(1)} h`;
