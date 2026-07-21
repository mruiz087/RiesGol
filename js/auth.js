// js/auth.js
// Manejo de Autenticación con Supabase (+ recuperación de contraseña)

let isLoginMode = true;
let currentUser = null;
let authPanel = 'login'; // login | register | forgot | recovery
let pendingPasswordRecovery = false;

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');
    const forgotForm = document.getElementById('forgot-form');
    const recoveryForm = document.getElementById('recovery-form');
    const toggleAuthBtn = document.getElementById('toggle-auth');
    const forgotLink = document.getElementById('forgot-password-link');
    const forgotBack = document.getElementById('forgot-back');
    const logoutBtn = document.getElementById('logout-btn');

    if (authForm) {
        authForm.addEventListener('submit', handleAuth);
    }
    if (forgotForm) {
        forgotForm.addEventListener('submit', handleForgotPassword);
    }
    if (recoveryForm) {
        recoveryForm.addEventListener('submit', handleUpdatePassword);
    }

    if (toggleAuthBtn) {
        toggleAuthBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            setAuthScreen(isLoginMode ? 'login' : 'register');
        });
    }

    if (forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.getElementById('email')?.value?.trim() || '';
            const forgotEmail = document.getElementById('forgot-email');
            if (forgotEmail && email) forgotEmail.value = email;
            setAuthScreen('forgot');
        });
    }

    if (forgotBack) {
        forgotBack.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = true;
            setAuthScreen('login');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    bindAuthStateChange();
    checkSession();
});

function getRecoveryRedirectTo() {
    const url = new URL(window.location.href);
    url.hash = '';
    url.search = '';
    return url.toString();
}

function isRecoveryUrl() {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return (
        /type=recovery/i.test(hash) ||
        /type=recovery/i.test(search) ||
        /type=recovery/i.test(decodeURIComponent(hash))
    );
}

function setAuthScreen(screen) {
    authScreen = screen;
    if (screen === 'login') isLoginMode = true;
    if (screen === 'register') isLoginMode = false;

    const authForm = document.getElementById('auth-form');
    const forgotForm = document.getElementById('forgot-form');
    const recoveryForm = document.getElementById('recovery-form');
    const subtitle = document.getElementById('auth-subtitle');
    const nameGroup = document.getElementById('name-group');
    const passwordGroup = document.getElementById('password-group');
    const forgotWrap = document.getElementById('forgot-password-wrap');
    const submitBtn = document.getElementById('auth-submit');
    const toggleBtn = document.getElementById('toggle-auth');
    const nameInput = document.getElementById('name');
    const passwordInput = document.getElementById('password');

    const showAuth = screen === 'login' || screen === 'register';
    authForm?.classList.toggle('hidden', !showAuth);
    forgotForm?.classList.toggle('hidden', screen !== 'forgot');
    recoveryForm?.classList.toggle('hidden', screen !== 'recovery');

    if (subtitle) {
        if (screen === 'forgot') subtitle.textContent = 'Recuperar contraseña';
        else if (screen === 'recovery') subtitle.textContent = 'Nueva contraseña';
        else subtitle.textContent = 'La porra definitiva';
    }

    if (showAuth) {
        const registering = screen === 'register';
        nameGroup?.classList.toggle('hidden', !registering);
        if (registering) nameInput?.setAttribute('required', 'true');
        else nameInput?.removeAttribute('required');
        passwordGroup?.classList.remove('hidden');
        passwordInput?.setAttribute('required', 'true');
        passwordInput?.setAttribute('autocomplete', registering ? 'new-password' : 'current-password');
        if (submitBtn) submitBtn.textContent = registering ? 'Crear cuenta' : 'Entrar';
        if (toggleBtn) {
            toggleBtn.textContent = registering ? 'Inicia sesión aquí' : 'Regístrate aquí';
        }
        const switchText = document.getElementById('auth-switch-text');
        if (switchText) {
            switchText.textContent = registering ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?';
        }
        forgotWrap?.classList.toggle('hidden', registering);
    }

    // Asegurar que la vista de login esté visible en recovery/forgot
    if (screen === 'forgot' || screen === 'recovery') {
        document.getElementById('navbar')?.classList.add('hidden');
        window.navigateTo?.('login-view');
    }
}

function bindAuthStateChange() {
    if (!window.supabaseClient?.auth?.onAuthStateChange) return;
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            pendingPasswordRecovery = true;
            currentUser = session?.user || null;
            window.currentUser = currentUser;
            setAuthScreen('recovery');
            return;
        }
        if (event === 'SIGNED_IN' && session?.user && pendingPasswordRecovery) {
            // Evitar saltar al dashboard hasta que cambie la contraseña
            currentUser = session.user;
            window.currentUser = currentUser;
            setAuthScreen('recovery');
        }
    });
}

function updateAuthUI() {
    setAuthScreen(isLoginMode ? 'login' : 'register');
}

async function handleAuth(e) {
    e.preventDefault();
    window.showLoading();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value;

    try {
        if (!window.supabaseClient) throw new Error('Supabase no está configurado.');

        if (isLoginMode) {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });
            if (error) throw error;
            currentUser = data.user;
        } else {
            const { data, error } = await window.supabaseClient.auth.signUp({
                email: email,
                password: password,
            });
            if (error) throw error;

            if (data.user) {
                const { error: profileError } = await window.supabaseClient
                    .from('users')
                    .insert([{ id: data.user.id, name: name }]);
                if (profileError) throw profileError;
            }
            currentUser = data.user;
            window.toast?.success('Cuenta creada con éxito.');
        }

        onLoginSuccess();
    } catch (error) {
        window.toast?.error('Error de autenticación: ' + error.message);
    } finally {
        window.hideLoading();
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    window.showLoading();

    const email = document.getElementById('forgot-email')?.value?.trim();
    try {
        if (!window.supabaseClient) throw new Error('Supabase no está configurado.');
        if (!email) throw new Error('Introduce tu email.');

        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: getRecoveryRedirectTo(),
        });
        if (error) throw error;

        window.toast?.success('Si el email existe, te hemos enviado un enlace de recuperación.');
        isLoginMode = true;
        setAuthScreen('login');
        const loginEmail = document.getElementById('email');
        if (loginEmail) loginEmail.value = email;
    } catch (error) {
        window.toast?.error('No se pudo enviar el enlace: ' + error.message);
    } finally {
        window.hideLoading();
    }
}

async function handleUpdatePassword(e) {
    e.preventDefault();
    window.showLoading();

    const password = document.getElementById('new-password')?.value || '';
    const confirm = document.getElementById('new-password-confirm')?.value || '';

    try {
        if (!window.supabaseClient) throw new Error('Supabase no está configurado.');
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
        if (password !== confirm) throw new Error('Las contraseñas no coinciden.');

        const { data, error } = await window.supabaseClient.auth.updateUser({ password });
        if (error) throw error;

        pendingPasswordRecovery = false;
        currentUser = data.user || currentUser;
        window.currentUser = currentUser;

        // Limpiar tokens de recovery de la URL
        if (window.history?.replaceState) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        window.toast?.success('Contraseña actualizada.');
        onLoginSuccess();
    } catch (error) {
        window.toast?.error('No se pudo guardar: ' + error.message);
    } finally {
        window.hideLoading();
    }
}

async function checkSession() {
    if (!window.supabaseClient) return;
    window.showLoading();
    try {
        // Si el enlace trae type=recovery, priorizar pantalla de nueva contraseña
        if (isRecoveryUrl()) {
            pendingPasswordRecovery = true;
        }

        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            window.currentUser = currentUser;
            if (pendingPasswordRecovery || isRecoveryUrl()) {
                pendingPasswordRecovery = true;
                setAuthScreen('recovery');
                return;
            }
            onLoginSuccess();
        } else if (pendingPasswordRecovery) {
            // Token aún procesándose; onAuthStateChange mostrará recovery
            setAuthScreen('recovery');
        }
    } catch (error) {
        console.error('Error comprobando sesión', error);
    } finally {
        window.hideLoading();
    }
}

function onLoginSuccess() {
    if (pendingPasswordRecovery) {
        setAuthScreen('recovery');
        return;
    }

    document.getElementById('navbar')?.classList.remove('hidden');
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
        pendingPasswordRecovery = false;

        if (window.Groups) {
            window.Groups.currentGroupId = null;
            window.Groups.currentTournamentId = null;
            window.Groups.currentUserHasPichichi = null;
            localStorage.removeItem('currentGroupId');
            localStorage.removeItem('currentTournamentId');
        }

        document.getElementById('navbar')?.classList.add('hidden');
        isLoginMode = true;
        setAuthScreen('login');
        window.navigateTo('login-view');
    } catch (error) {
        console.error('Error al salir', error);
    } finally {
        window.hideLoading();
    }
}

window.getCurrentUser = function () {
    return currentUser;
};
