// Crea el pago de Mercado Pago para el usuario con sesión y devuelve el enlace para pagar.
import { cors, json, settings, price, userFromToken, proof, mercadoPago, FUNCTIONS_URL } from '../_shared/pro.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  try {
    const token = req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return json({ error: 'Necesitás iniciar sesión.' }, 401);
    const userId = await userFromToken(token);
    if (!userId) return json({ error: 'Necesitás iniciar sesión.' }, 401);
    const s = await settings(), p = price(s.pro_price_ars);
    if (p === null) return json({ error: 'El cobro todavía no está habilitado.' }, 400);
    const back = s.site_url || 'https://a-la-pelotita.lovable.app/juego/index.html';
    const notify = new URL(`${FUNCTIONS_URL}/mp-webhook`);
    notify.searchParams.set('user', userId); notify.searchParams.set('proof', await proof(userId));
    const pref = await mercadoPago('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ title: 'A la Pelotita PRO · 30 días', quantity: 1, unit_price: p, currency_id: 'ARS' }],
        external_reference: userId,
        notification_url: notify.toString(),
        back_urls: { success: back + '#pro-pago', pending: back + '#pro-pago', failure: back + '#pro-pago' },
        auto_return: 'approved',
      }),
    });
    if (typeof pref?.init_point !== 'string') throw new Error('sin enlace');
    return json({ url: pref.init_point });
  } catch (e) {
    console.error('pro-checkout', String(e));
    return json({ error: 'No se pudo preparar el pago. Intentá nuevamente.' }, 502);
  }
});
