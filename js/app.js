// js/app.js
// Manejo principal de la aplicación y enrutamiento SPA

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    registerServiceWorker();
});

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
            // Ignorar el botón de salir
            if (e.target.id === 'logout-btn') return;

            e.preventDefault();
            const targetId = e.target.getAttribute('data-target');
            if (targetId) {
                navigateTo(targetId);

                // Actualizar clase activa
                navLinks.forEach(l => l.classList.remove('active'));
                e.target.classList.add('active');

                // Cerrar menú móvil si está abierto
                const navUl = document.querySelector('.nav-links');
                if (navUl.classList.contains('show')) {
                    navUl.classList.remove('show');
                }
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

// Función para cambiar de vista (SPA)
window.navigateTo = function(viewId) {
    const views = document.querySelectorAll('.view');
    views.forEach(view => {
        view.classList.remove('active');
        view.classList.add('hidden');
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active');
        
        // Llamar a funciones de carga de datos según la vista
        if (viewId === 'dashboard-view' && window.loadRanking) {
            window.loadRanking();
        } else if (viewId === 'matches-view' && window.loadMatches) {
            window.loadMatches();
        } else if (viewId === 'pichichi-view' && window.loadPichichiData) {
            window.loadPichichiData();
        } else if (viewId === 'stats-view' && window.loadStats) {
            window.loadStats();
        } else if (viewId === 'group-admin-view' && window.Admin) {
            window.Admin.loadGroupMembers();
            window.Admin.loadSpecialPrizeConfig();
            window.Admin.loadTournamentStatus();
        }
        
        // Actualizar visibilidad del enlace de admin
        if (window.Admin) {
            window.Admin.updateAdminLinkVisibility();
        }
    }
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
