/* A la Pelotita · configuración del servidor de la comunidad.
   Apunta al proyecto propio de Supabase "a-la-pelotita-sp" (São Paulo).
   La clave es la pública (publishable): puede estar en el código; los datos los protegen las reglas de supabase/schema.sql.
   Vacío = modo demo (todo se guarda solo en este dispositivo). */
(function () {
  'use strict';
  window.PP = window.PP || {};
  window.PP.CONFIG = {
    supabaseUrl: 'https://lldifserfqgnjowgrfej.supabase.co',
    supabaseKey: 'sb_publishable_2U4cZD0SNGanyIPXIaiffA_XpNVR_8E',
    // Suscripción Pro: dirección de la función del servidor que crea el pago de Mercado Pago (vacío = sin cobro automático).
    // El precio en pesos se guarda en el servidor (tabla app_settings, clave pro_price_ars).
    proCheckout: 'https://lldifserfqgnjowgrfej.supabase.co/functions/v1/pro-checkout',
    // Alternativa manual: texto del precio y enlace o WhatsApp donde se paga. Vacío = "pedí tu alta".
    proPrice: '',
    proLink: '',
    // Entrar con Google: poner true recién cuando Google esté configurado en Supabase (Authentication → Sign In / Providers → Google)
    googleLogin: false
  };
})();
