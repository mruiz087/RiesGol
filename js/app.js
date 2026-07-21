// js/app.js
// Manejo principal de la aplicación y enrutamiento SPA

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    registerServiceWorker();
});

// Toasts (mensajes amigables)
window.toast = (function() {
    const DEFAULT_MS = 3500;

    function getContainer() {
        return document.getElementById('toast-container');
    }

    function iconFor(type) {
        if (type === 'success') return '✓';
        if (type === 'error') return '!';
        if (type === 'warning') return '⚠';
        return 'ℹ';
    }

    function titleFor(type) {
        if (type === 'success') return 'Listo';
        if (type === 'error') return 'Error';
        if (type === 'warning') return 'Atención';
        return 'Info';
    }

    function show(type, message, opts = {}) {
        const container = getContainer();
        if (!container) return;

        const ms = Number.isFinite(opts.ms) ? opts.ms : DEFAULT_MS;
        const title = opts.title || titleFor(type);

        const toastEl = document.createElement('div');
        toastEl.className = `toast ${type}`;
        toastEl.innerHTML = `
            <div class="toast-icon">${iconFor(type)}</div>
            <div class="toast-body">
                <div class="toast-title">${title}</div>
                <div class="toast-message"></div>
            </div>
            <button class="toast-close" type="button" aria-label="Cerrar">×</button>
        `;

        const msgEl = toastEl.querySelector('.toast-message');
        msgEl.textContent = String(message || '');

        const closeBtn = toastEl.querySelector('.toast-close');
        const remove = () => {
            if (!toastEl.isConnected) return;
            toastEl.classList.add('hide');
            setTimeout(() => toastEl.remove(), 180);
        };

        closeBtn.addEventListener('click', remove);
        container.appendChild(toastEl);

        if (ms > 0) setTimeout(remove, ms);
        return toastEl;
    }

    return {
        success: (msg, opts) => show('success', msg, opts),
        error: (msg, opts) => show('error', msg, opts),
        info: (msg, opts) => show('info', msg, opts),
        warning: (msg, opts) => show('warning', msg, opts),
        show
    };
})();

function initApp() {
    // Inicializar módulos
    if (window.Groups) {
        window.Groups.init();
    }
    if (window.Admin) {
        window.Admin.init();
    }

    // Escuchar clicks en los enlaces de navegación
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (e.currentTarget.id === 'logout-btn') return;

            e.preventDefault();

            if (e.currentTarget.getAttribute('data-leave-group') === 'true') {
                if (window.Groups) {
                    window.Groups.returnToList();
                }
                return;
            }

            const targetId = e.currentTarget.getAttribute('data-target');
            if (targetId) {
                navigateTo(targetId);
            }
        });
    });

    // Menú móvil
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    if (mobileBtn) {
        mobileBtn.setAttribute('aria-expanded', 'false');
        mobileBtn.addEventListener('click', () => {
            const navUl = document.querySelector('.nav-links');
            if (!navUl) return;
            const open = navUl.classList.toggle('show');
            mobileBtn.setAttribute('aria-expanded', String(open));
        });
    }
}

function closeMobileNav() {
    const navUl = document.querySelector('.nav-links');
    if (navUl) {
        navUl.classList.remove('show');
    }
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    if (mobileBtn) {
        mobileBtn.setAttribute('aria-expanded', 'false');
    }
}

window.closeMobileNav = closeMobileNav;

const PICHICHI_GATED_VIEWS = new Set([
    'dashboard-view',
    'matches-view',
    'results-view',
    'group-admin-view',
]);

async function isCurrentUserGroupAdmin() {
    const groupId = window.Groups?.currentGroupId;
    const userId = window.getCurrentUser?.()?.id || window.currentUser?.id;
    if (!groupId || !userId || !window.Admin?.isAdmin) return false;
    try {
        return !!(await window.Admin.isAdmin(groupId, userId));
    } catch (_) {
        return false;
    }
}

// Función para cambiar de vista (SPA)
window.navigateTo = async function(viewId, options = {}) {
    closeMobileNav();

    let resolvedViewId = viewId;

    if (
        PICHICHI_GATED_VIEWS.has(viewId)
        && window.Groups?.currentGroupId
        && typeof window.Groups.userHasPichichi === 'function'
    ) {
        const isAdmin = await isCurrentUserGroupAdmin();
        if (!isAdmin) {
            const hasPichichi = await window.Groups.userHasPichichi();
            if (!hasPichichi) {
                resolvedViewId = 'pichichi-view';
                if (viewId !== 'pichichi-view') {
                    window.toast?.warning('Primero debes elegir tus equipos pichichi.');
                }
            }
        }
    }

    const views = document.querySelectorAll('.view');
    views.forEach(view => {
        view.classList.remove('active');
        view.classList.add('hidden');
    });

    const targetView = document.getElementById(resolvedViewId);
    if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active');

        if (resolvedViewId === 'dashboard-view' && window.loadRanking) {
            window.loadRanking();
        } else if (resolvedViewId === 'matches-view' && window.loadMatches) {
            window.loadMatches();
        } else if (resolvedViewId === 'results-view' && window.loadResults) {
            window.loadResults({ userId: options.userId || null });
        } else if (resolvedViewId === 'pichichi-view' && window.loadPichichiData) {
            window.loadPichichiData();
        } else if (resolvedViewId === 'group-admin-view' && window.Admin) {
            window.Admin.loadGroupMembers();
            window.Admin.loadSpecialPrizeConfig();
            window.Admin.loadTournamentStatus();
            window.Admin.loadTeamValuesEditor();
            window.Admin.loadScoringRulesEditor?.();
            window.Admin.switchAdminTab?.('general');
        } else if (resolvedViewId === 'opciones-view' && window.loadOpciones) {
            window.loadOpciones();
        }

        if (resolvedViewId === 'my-groups-view' && window.Groups) {
            window.Groups.loadUserGroups();
        }

        updateNavVisibility();
        setActiveNavLink(resolvedViewId);

        if (window.Admin) {
            await window.Admin.updateAdminLinkVisibility();
        }
    }

    // Tras actualizar items del menú (entrar en porra → Clasificación), forzar colapso
    closeMobileNav();
    requestAnimationFrame(closeMobileNav);
}

function setActiveNavLink(viewId) {
    const navLinks = document.querySelectorAll('.nav-links a[data-target]');
    navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-target') === viewId);
    });
}

// Actualizar visibilidad del menú según estado del grupo
function updateNavVisibility() {
    const hasGroup = window.Groups?.currentGroupId != null;
    const groupOnlyItems = document.querySelectorAll('.group-only');
    const noGroupOnlyItems = document.querySelectorAll('.no-group-only');

    groupOnlyItems.forEach(item => {
        // Admin lo gestiona updateAdminLinkVisibility (evitar display:block que desalineaba)
        if (item.id === 'admin-nav-item' || item.querySelector?.('#admin-link')) return;
        item.style.display = hasGroup ? '' : 'none';
    });
    noGroupOnlyItems.forEach(item => {
        item.style.display = hasGroup ? 'none' : '';
    });
}
window.updateNavVisibility = updateNavVisibility;

// Utilidad para mostrar/ocultar el loading overlay
window.showLoading = function() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('hidden');
}

window.hideLoading = function() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}

// Registro de Service Worker para PWA
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js?v=70')
                .then(registration => {
                    console.log('SW registrado con éxito: ', registration.scope);
                    registration.update();
                    // Si hay un SW esperando, forzar activación
                    if (registration.waiting) {
                        registration.waiting.postMessage?.({ type: 'SKIP_WAITING' });
                    }
                })
                .catch(err => {
                    console.log('Fallo en el registro del SW: ', err);
                });

            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                refreshing = true;
                window.location.reload();
            });
        });
    }
}
