// Funciones comunes del cobro Pro con Mercado Pago (pago único de 30 días, en pesos).
export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Cache-Control': 'no-store',
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };

export async function settings(): Promise<Record<string, string>> {
  const r = await fetch(`${URL_}/rest/v1/app_settings?select=key,value`, { headers: svc });
  if (!r.ok) throw new Error('settings');
  const out: Record<string, string> = {};
  for (const row of await r.json()) out[row.key] = row.value ?? '';
  return out;
}
export function price(v: string | undefined): number | null {
  if (!v || !/^[0-9]+([.][0-9]+)?$/.test(v)) return null;
  const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null;
}
export async function userFromToken(token: string): Promise<string | null> {
  const r = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: SERVICE, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u = await r.json();
  return typeof u?.id === 'string' ? u.id : null;
}
// Firma propia que une el aviso de Mercado Pago con el usuario que pagó (nadie más puede inventar avisos)
export async function proof(userId: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SERVICE), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`pro-payment:${userId}`));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function mercadoPago(path: string, init?: RequestInit): Promise<any> {
  const token = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
  if (!token) throw new Error('Mercado Pago no está configurado.');
  const r = await fetch(`https://api.mercadopago.com${path}`, {
    ...init, signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!r.ok) { console.error('Mercado Pago respondió', r.status); throw new Error(`Mercado Pago ${r.status}`); }
  return r.json();
}
export async function applyPayment(id: string, userId: string, amount: number, status: string, currency: string): Promise<boolean> {
  const r = await fetch(`${URL_}/rest/v1/rpc/apply_pro_payment`, {
    method: 'POST', headers: svc,
    body: JSON.stringify({ p_mp_payment_id: id, p_user_id: userId, p_amount: amount, p_status: status, p_currency: currency }),
  });
  if (!r.ok) { console.error('apply_pro_payment', r.status, await r.text()); return false; }
  return (await r.json()) === true;
}
export const FUNCTIONS_URL = `${URL_}/functions/v1`;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
