// Registro de jugadores: crea la cuenta ya confirmada (sin mail de confirmación) y con sus datos del juego.
// Después el juego entra con la contraseña de siempre.
const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const CATS = ['No sé', '8va', '7ma', '6ta', '5ta', '4ta', '3ra', '2da', '1ra'], SIDES = ['Drive', 'Revés', 'Ambos'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  let f: any = {};
  try { f = await req.json(); } catch { return json({ error: 'Datos inválidos.' }, 400); }
  const email = String(f.email || '').trim().toLowerCase(), password = String(f.password || ''), name = String(f.name || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return json({ error: 'Escribí un mail válido.' }, 400);
  if (password.length < 6 || password.length > 72) return json({ error: 'La contraseña tiene que tener al menos 6 caracteres.' }, 400);
  if (name.length < 2 || name.length > 40) return json({ error: 'Escribí tu nombre o apodo.' }, 400);
  const cat = CATS.includes(f.cat) ? f.cat : '8va', side = SIDES.includes(f.side) ? f.side : 'Drive';
  const r = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name, cat, side } }),
  });
  if (r.ok) return json({ ok: true });
  const j = await r.json().catch(() => ({}));
  const msg = String(j.msg || j.message || j.error_description || j.error || '');
  if (/already|registered|exists/i.test(msg)) return json({ error: 'Ya hay una cuenta con ese mail.' }, 400);
  if (/password/i.test(msg)) return json({ error: 'Esa contraseña no sirve: probá con una más larga o menos común.' }, 400);
  console.error('signup', r.status, msg);
  return json({ error: 'No se pudo crear la cuenta. Probá de nuevo.' }, 500);
});
