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

            const navUl = document.querySelector('.nav-links');
            if (navUl.classList.contains('show')) {
                navUl.classList.remove('show');
            }
        });
    });

    // Menú móvil
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            document.querySelector('.nav-links').classList.toggle('show');
        });
    }
}

const PICHICHI_GATED_VIEWS = new Set([
    'dashboard-view',
    'matches-view',
    'results-view',
    'group-admin-view',
]);

// Función para cambiar de vista (SPA)
window.navigateTo = async function(viewId) {
    let resolvedViewId = viewId;

    if (
        PICHICHI_GATED_VIEWS.has(viewId)
        && window.Groups?.currentGroupId
        && typeof window.Groups.userHasPichichi === 'function'
    ) {
        const hasPichichi = await window.Groups.userHasPichichi();
        if (!hasPichichi) {
            resolvedViewId = 'pichichi-view';
            if (viewId !== 'pichichi-view') {
                window.toast?.warning('Primero debes elegir tus equipos pichichi.');
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
            window.loadResults();
        } else if (resolvedViewId === 'pichichi-view' && window.loadPichichiData) {
            window.loadPichichiData();
        } else if (resolvedViewId === 'group-admin-view' && window.Admin) {
            window.Admin.loadGroupMembers();
            window.Admin.loadSpecialPrizeConfig();
            window.Admin.loadTournamentStatus();
            window.Admin.loadTeamValuesEditor();
        } else if (resolvedViewId === 'opciones-view' && window.loadOpciones) {
            window.loadOpciones();
        }

        if (resolvedViewId === 'my-groups-view' && window.Groups) {
            window.Groups.loadUserGroups();
        }

        updateNavVisibility();
        setActiveNavLink(resolvedViewId);

        if (window.Admin) {
            window.Admin.updateAdminLinkVisibility();
        }
    }
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
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('SW registrado con éxito: ', registration.scope);
                })
                .catch(err => {
                    console.log('Fallo en el registro del SW: ', err);
                });
        });
    }
}
