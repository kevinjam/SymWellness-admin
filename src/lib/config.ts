/** Empty string = same origin (dev proxy / reverse proxy). */
export const API_BASE: string = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export const API_LABEL: string = API_BASE
  ? API_BASE.replace(/^https?:\/\//, '')
  : 'same origin (/api)';
