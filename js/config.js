/* A la Pelotita · configuración del servidor de la comunidad.
   Apunta a la base Supabase del proyecto de Lovable Cloud "A la Pelotita Servidor".
   La clave es la pública (publishable): puede estar en el código; los datos los protegen las reglas de supabase/schema.sql.
   Vacío = modo demo (todo se guarda solo en este dispositivo). */
(function () {
  'use strict';
  window.PP = window.PP || {};
  window.PP.CONFIG = {
    supabaseUrl: 'https://c--09345d9f-198e-448d-b310-c12bf6ec6aeb-prod.lovable.cloud',
    supabaseKey: 'sb_publishable_mLT9nZBU2PMkW2waeDeN8w_wSYFhtA3',
    // Suscripción Pro: dirección de la función del servidor que crea el pago de Mercado Pago (vacío = sin cobro automático).
    // El precio en pesos se guarda en el servidor (tabla app_settings, clave pro_price_ars).
    proCheckout: '',
    // Alternativa manual: texto del precio y enlace o WhatsApp donde se paga. Vacío = "pedí tu alta".
    proPrice: '',
    proLink: ''
  };
})();
