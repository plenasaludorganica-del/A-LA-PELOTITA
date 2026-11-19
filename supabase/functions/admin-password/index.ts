// La administración le pone una contraseña nueva a un jugador (por ejemplo, cuando se la olvidó y no le llega el mail).
// Solo funciona para quien es administradora (profiles.is_admin o su mail en la tabla admins). La contraseña nueva
// no se guarda en ningún lado: la administración se la pasa al jugador y él la cambia desde Cuenta.
const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  try {
    const token = req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return json({ error: 'Necesitás iniciar sesión.' }, 401);
    const me = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: SERVICE, Authorization: `Bearer ${token}` } });
    if (!me.ok) return json({ error: 'Necesitás iniciar sesión.' }, 401);
    const u = await me.json();
    const myMail = String(u?.email || '').toLowerCase();
    const [p, a] = await Promise.all([
      fetch(`${URL_}/rest/v1/profiles?id=eq.${encodeURIComponent(u.id)}&select=is_admin`, { headers: svc }).then((r) => r.json()),
      fetch(`${URL_}/rest/v1/admins?email=eq.${encodeURIComponent(myMail)}&select=email`, { headers: svc }).then((r) => r.ok ? r.json() : []),
    ]);
    const isAdmin = (Array.isArray(p) && p[0]?.is_admin === true) || (Array.isArray(a) && a.length > 0);
    if (!isAdmin) return json({ error: 'Solo la administración puede hacer esto.' }, 403);

    let f: any = {};
    try { f = await req.json(); } catch { return json({ error: 'Datos inválidos.' }, 400); }
    const email = String(f.email || '').trim().toLowerCase(), password = String(f.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Mail inválido.' }, 400);
    if (password.length < 6 || password.length > 72) return json({ error: 'La contraseña tiene que tener entre 6 y 72 caracteres.' }, 400);

    const idr = await fetch(`${URL_}/rest/v1/rpc/user_id_by_email`, { method: 'POST', headers: svc, body: JSON.stringify({ p_email: email }) });
    const id = idr.ok ? await idr.json() : null;
    if (!id) return json({ error: 'No hay ninguna cuenta con ese mail.' }, 404);
    const r = await fetch(`${URL_}/auth/v1/admin/users/${id}`, { method: 'PUT', headers: svc, body: JSON.stringify({ password }) });
    if (r.ok) return json({ ok: true });
    const j = await r.json().catch(() => ({}));
    const msg = String(j.msg || j.message || j.error_description || j.error || '');
    if (/password/i.test(msg)) return json({ error: 'Esa contraseña no sirve: probá con una más larga o menos común.' }, 400);
    console.error('admin-password', r.status, msg);
    return json({ error: 'No se pudo cambiar la contraseña. Probá de nuevo.' }, 500);
  } catch (e) {
    console.error('admin-password', String(e));
    return json({ error: 'No se pudo cambiar la contraseña. Probá de nuevo.' }, 500);
  }
});
