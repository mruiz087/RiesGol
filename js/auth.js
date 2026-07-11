// js/auth.js
// Manejo de Autenticación con Supabase

let isLoginMode = true;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');
    const toggleAuthBtn = document.getElementById('toggle-auth');
    const logoutBtn = document.getElementById('logout-btn');

    if (authForm) {
        authForm.addEventListener('submit', handleAuth);
    }

    if (toggleAuthBtn) {
        toggleAuthBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            updateAuthUI();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Comprobar sesión activa al cargar
    checkSession();
});

function updateAuthUI() {
    const nameGroup = document.getElementById('name-group');
    const submitBtn = document.getElementById('auth-submit');
    const toggleBtn = document.getElementById('toggle-auth');
    
    if (isLoginMode) {
        nameGroup.classList.add('hidden');
        document.getElementById('name').removeAttribute('required');
        submitBtn.textContent = 'Entrar';
        toggleBtn.textContent = 'Regístrate aquí';
    } else {
        nameGroup.classList.remove('hidden');
        document.getElementById('name').setAttribute('required', 'true');
        submitBtn.textContent = 'Crear cuenta';
        toggleBtn.textContent = 'Inicia sesión aquí';
    }
}

async function handleAuth(e) {
    e.preventDefault();
    window.showLoading();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value;

    try {
        if (!window.supabaseClient) throw new Error("Supabase no está configurado.");

        if (isLoginMode) {
            // Login
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });
            if (error) throw error;
            currentUser = data.user;
        } else {
            // Registro
            const { data, error } = await window.supabaseClient.auth.signUp({
                email: email,
                password: password,
            });
            if (error) throw error;
            
            // Insertar datos adicionales del usuario en la tabla 'users'
            if (data.user) {
                const { error: profileError } = await window.supabaseClient
                    .from('users')
                    .insert([
                        { id: data.user.id, name: name, puntaje_total: 0, elegible_ultimo_puesto: true }
                    ]);
                if (profileError) throw profileError;
            }
            currentUser = data.user;
            alert("Cuenta creada con éxito.");
        }
        
        onLoginSuccess();
    } catch (error) {
        alert("Error de autenticación: " + error.message);
    } finally {
        window.hideLoading();
    }
}

async function checkSession() {
    if (!window.supabaseClient) return;
    window.showLoading();
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            onLoginSuccess();
        }
    } catch (error) {
        console.error("Error comprobando sesión", error);
    } finally {
        window.hideLoading();
    }
}

function onLoginSuccess() {
    document.getElementById('navbar').classList.remove('hidden');
    window.currentUser = currentUser;
    
    if (window.Groups) {
        window.Groups.loadUserGroups();
    }

    const hasGroup = window.Groups?.currentGroupId != null;
    window.navigateTo(hasGroup ? 'dashboard-view' : 'my-groups-view');
}

async function handleLogout(e) {
    e.preventDefault();
    if (!window.supabaseClient) return;
    
    window.showLoading();
    try {
        await window.supabaseClient.auth.signOut();
        currentUser = null;
        window.currentUser = null;
        
        // Limpiar estado de grupos
        if (window.Groups) {
            window.Groups.currentGroupId = null;
            window.Groups.currentTournamentId = null;
            localStorage.removeItem('currentGroupId');
            localStorage.removeItem('currentTournamentId');
        }
        
        document.getElementById('navbar').classList.add('hidden');
        window.navigateTo('login-view');
    } catch (error) {
        console.error("Error al salir", error);
    } finally {
        window.hideLoading();
    }
}

// Exportar currentUser para uso en otros archivos
window.getCurrentUser = function() {
    return currentUser;
};
