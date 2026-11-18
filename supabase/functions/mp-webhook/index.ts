// Recibe los avisos de Mercado Pago. Consulta el pago a Mercado Pago (no confía en el aviso)
// y, si está aprobado en pesos por el precio vigente, suma 30 días de Pro una sola vez.
import { json, settings, price, proof, mercadoPago, applyPayment, UUID } from '../_shared/pro.ts';

function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url), user = url.searchParams.get('user') ?? '', sig = url.searchParams.get('proof') ?? '';
    if (!UUID.test(user) || !/^[a-f0-9]{64}$/.test(sig) || !same(sig, await proof(user))) return json({ ok: true });
    let body: any = {};
    if (req.method === 'POST') { const t = await req.text(); if (t && t.length < 16384) { try { body = JSON.parse(t); } catch { body = {}; } } }
    const topic = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? body.type ?? body.topic;
    if (topic !== 'payment') return json({ ok: true });
    const id = String(url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? body?.data?.id ?? body?.id ?? '');
    if (!/^[0-9]{1,30}$/.test(id)) return json({ ok: true });
    const pay = await mercadoPago(`/v1/payments/${id}`);
    if (String(pay?.id) !== id || pay?.external_reference !== user) return json({ ok: true });
    const p = price((await settings()).pro_price_ars);
    if (p === null || pay.status !== 'approved' || pay.currency_id !== 'ARS' || !(Number(pay.transaction_amount) >= p)) return json({ ok: true });
    const done = await applyPayment(id, user, Number(pay.transaction_amount), pay.status, pay.currency_id);
    console.log('pago', id, done ? 'acreditado' : 'ya acreditado o rechazado');
  } catch (e) {
    console.error('mp-webhook', String(e));
  }
  return json({ ok: true });
});
