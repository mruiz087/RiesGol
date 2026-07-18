// js/supabase.js
// Configuración de Supabase
// NOTA PARA EL USUARIO: Debes reemplazar estos valores con tu URL y ANON KEY de Supabase.
const SUPABASE_URL = 'https://bfvdolcbtncxnspxgfcq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdmRvbGNidG5jeG5zcHhnZmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzY3NTEsImV4cCI6MjA4MzU1Mjc1MX0.dB8GBmomyk5s19CBXfB2TKjt3tKokAZ6HcqV8l29lQQ';

// Inicializar cliente de Supabase solo si existe la librería
let supabaseClient = null;
let supabasePublicClient = null;

if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        db: {
            schema: 'porra'
        }
    });
    // Cliente en schema public: RPCs como get_group_bets
    supabasePublicClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase inicializado correctamente con esquema 'porra'.");
} else {
    console.warn("Librería de Supabase no cargada.");
}

window.supabaseClient = supabaseClient;
window.supabasePublicClient = supabasePublicClient;
window.SUPABASE_URL = SUPABASE_URL;
