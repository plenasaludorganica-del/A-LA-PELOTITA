/* A la Pelotita · configuración del servidor de la comunidad.
   Vacío = modo demo (todo se guarda solo en este dispositivo).
   Para activar cuentas, ranking y torneos entre jugadores: crear un proyecto en supabase.com,
   ejecutar supabase/schema.sql y pegar acá la URL del proyecto y la clave pública "anon". */
(function () {
  'use strict';
  window.PP = window.PP || {};
  window.PP.CONFIG = {
    supabaseUrl: '',
    supabaseKey: ''
  };
})();
