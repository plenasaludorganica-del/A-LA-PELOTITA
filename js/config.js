/* A la Pelotita · configuración del servidor de la comunidad.
   Vacío = modo demo (todo se guarda solo en este dispositivo).
   Para activar cuentas, ranking y torneos entre jugadores: crear un proyecto en supabase.com,
   ejecutar supabase/schema.sql y pegar acá la URL del proyecto y la clave pública "anon". */
(function () {
  'use strict';
  window.PP = window.PP || {};
  window.PP.CONFIG = {
    supabaseUrl: 'https://xcvhqbqopuphdyuijvpu.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdmhxYnFvcHVwaGR5dWlqdnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwMjE5MjAsImV4cCI6MjExMDU5NzkyMH0.bQJhqOVYO6gLZvqpqO2sKkeHP-Zf6RVxb9aRZ0VwIS4'
  };
})();
