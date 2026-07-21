// js/opciones.js
// Lógica para la pestaña de opciones: nombre, avatar y logout

let loadedDisplayName = '';
let loadedAvatarId = null;
let avatarPickerBound = false;

document.addEventListener('DOMContentLoaded', () => {
    const changeNameForm = document.getElementById('change-name-form');
    const changePasswordForm = document.getElementById('change-password-form');
    const logoutBtn = document.getElementById('logout-btn');
    const nameInput = document.getElementById('new-name');
    const saveBtn = document.getElementById('save-name-btn');

    if (changeNameForm) {
        changeNameForm.addEventListener('submit', handleChangeName);
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePassword);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    if (nameInput) {
        const startEditing = () => {
            if (!nameInput.readOnly) return;
            nameInput.readOnly = false;
            nameInput.classList.add('is-editing');
            nameInput.focus();
            nameInput.select();
            updateSaveNameButton();
        };

        nameInput.addEventListener('click', startEditing);
        nameInput.addEventListener('focus', startEditing);
        nameInput.addEventListener('input', updateSaveNameButton);
        nameInput.addEventListener('blur', () => {
            if (nameInput.value.trim() === loadedDisplayName) {
                nameInput.readOnly = true;
                nameInput.classList.remove('is-editing');
                nameInput.value = loadedDisplayName;
                updateSaveNameButton();
            }
        });
    }

    if (saveBtn) {
        saveBtn.disabled = true;
    }

    const opcionesRoot = document.getElementById('opciones-view');
    if (opcionesRoot) {
        opcionesRoot.addEventListener('click', (e) => {
            const tabBtn = e.target.closest?.('[data-opciones-tab]');
            if (!tabBtn || !opcionesRoot.contains(tabBtn)) return;
            e.preventDefault();
            switchOpcionesTab(tabBtn.getAttribute('data-opciones-tab'));
        });
    }
});

function switchOpcionesTab(tabId) {
    const root = document.getElementById('opciones-view');
    if (!root || !tabId) return;

    root.querySelectorAll('[data-opciones-tab]').forEach((btn) => {
        const active = btn.getAttribute('data-opciones-tab') === tabId;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', String(active));
    });

    root.querySelectorAll('[data-opciones-panel]').forEach((panel) => {
        const active = panel.getAttribute('data-opciones-panel') === tabId;
        panel.classList.toggle('active', active);
        if (active) panel.removeAttribute('hidden');
        else panel.setAttribute('hidden', '');
    });
}
function updateSaveNameButton() {
    const nameInput = document.getElementById('new-name');
    const saveBtn = document.getElementById('save-name-btn');
    if (!nameInput || !saveBtn) return;

    const next = nameInput.value.trim();
    const canSave = !nameInput.readOnly && next.length > 0 && next !== loadedDisplayName;
    saveBtn.disabled = !canSave;
}

function renderActivableRulesDocs() {
    const el = document.getElementById('opciones-rules-activables');
    const SR = window.ScoringRules;
    if (!el) return;

    if (!SR?.RULE_META?.length) {
        el.innerHTML = '<p class="text-muted">No se pudieron cargar las reglas.</p>';
        return;
    }

    const defaults = SR.getDefaultScoringRules?.() || {};
    const byCat = {
        favorite: { title: 'Equipo favorito', items: [] },
        general: { title: 'Porra general', items: [] },
    };

    SR.RULE_META.forEach((m) => {
        if (m.pending) return;
        const bucket = byCat[m.category] || byCat.general;
        const defOn = !!defaults[m.key]?.enabled;
        const params = (m.params || [])
            .map((p) => `${p.label} (def. ${p.default})`)
            .join(', ');
        bucket.items.push({
            label: m.label,
            description: m.description,
            icon: m.icon,
            defOn,
            params,
        });
    });

    const iconHtml = (name) => (SR.svgIcon ? SR.svgIcon(name) : '');

    el.innerHTML = Object.values(byCat).map((cat) => {
        if (!cat.items.length) return '';
        return `
            <h4 class="opciones-rules-subtitle">${cat.title}</h4>
            <ul class="opciones-rules-activables-list">
                ${cat.items.map((item) => `
                    <li class="opciones-rule-item">
                        <div class="opciones-rule-item-head">
                            <span class="rule-icon-relief rule-icon-relief--sm">${iconHtml(item.icon)}</span>
                            <strong>${item.label}</strong>
                            <span class="opciones-rule-default">${item.defOn ? 'activa por defecto' : 'opcional'}</span>
                        </div>
                        <p class="opciones-rule-item-desc">${item.description}</p>
                        ${item.params ? `<p class="opciones-rule-item-params">Parámetros: ${item.params}</p>` : ''}
                    </li>
                `).join('')}
            </ul>`;
    }).join('');
}

function renderAvatarPicker(selectedId) {
    const picker = document.getElementById('avatar-picker');
    const Av = window.Avatars;
    if (!picker || !Av?.AVATARS) return;

    const current = selectedId || Av.DEFAULT_ID;
    picker.innerHTML = Av.AVATARS.map((a) => {
        const sel = a.id === current ? ' is-selected' : '';
        return `
            <button type="button" class="avatar-option${sel}" data-avatar-id="${a.id}"
                role="option" aria-selected="${a.id === current}" title="${a.label}">
                <img src="${a.src}" alt="${a.label}" width="56" height="56" />
                <span class="avatar-option-label">${a.label}</span>
            </button>`;
    }).join('');

    if (!avatarPickerBound) {
        avatarPickerBound = true;
        picker.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-avatar-id]');
            if (!btn) return;
            const id = btn.getAttribute('data-avatar-id');
            await saveAvatar(id);
        });
    }
}

async function saveAvatar(avatarId) {
    const user = window.getCurrentUser?.() || window.currentUser;
    const Av = window.Avatars;
    if (!user || !window.supabaseClient || !Av) return;

    const valid = Av.getAvatarById(avatarId);
    if (!valid) return;
    if (valid.id === loadedAvatarId) return;

    try {
        const { error } = await window.supabaseClient
            .from('users')
            .update({ avatar: valid.id })
            .eq('id', user.id);

        if (error) throw error;

        loadedAvatarId = valid.id;
        renderAvatarPicker(loadedAvatarId);
        window.toast?.success?.(`Avatar: ${valid.label}`);
    } catch (err) {
        console.error('Error guardando avatar:', err);
        window.toast?.error?.('No se pudo guardar el avatar. ¿Ejecutaste la migración SQL?');
    }
}

window.loadOpciones = async function () {
    const nameInput = document.getElementById('new-name');
    if (!nameInput) return;

    renderActivableRulesDocs();

    const user = window.getCurrentUser?.() || window.currentUser;
    if (!user || !window.supabaseClient) {
        loadedDisplayName = '';
        loadedAvatarId = null;
        nameInput.value = '';
        nameInput.readOnly = true;
        nameInput.classList.remove('is-editing');
        updateSaveNameButton();
        renderAvatarPicker(null);
        return;
    }

    try {
        const { data, error } = await window.supabaseClient
            .from('users')
            .select('name, avatar')
            .eq('id', user.id)
            .maybeSingle();

        if (error) throw error;

        loadedDisplayName = (data?.name || user.email?.split('@')[0] || '').trim();
        loadedAvatarId = data?.avatar || null;
        nameInput.value = loadedDisplayName;
        nameInput.readOnly = true;
        nameInput.classList.remove('is-editing');
        updateSaveNameButton();
        renderAvatarPicker(loadedAvatarId);
    } catch (err) {
        console.error('Error cargando perfil:', err);
        loadedDisplayName = '';
        loadedAvatarId = null;
        nameInput.value = '';
        nameInput.placeholder = 'No se pudo cargar el nombre';
        updateSaveNameButton();
        renderAvatarPicker(null);
    }
};

async function handleChangeName(e) {
    e.preventDefault();
    window.showLoading();

    const user = window.getCurrentUser();
    if (!user || !window.supabaseClient) {
        window.toast?.error('Debes iniciar sesión para cambiar tu nombre.');
        window.hideLoading();
        return;
    }

    const nameInput = document.getElementById('new-name');
    const newName = nameInput?.value.trim() || '';

    if (!newName) {
        window.toast?.warning('Por favor, introduce un nombre válido.');
        window.hideLoading();
        return;
    }

    try {
        const { error } = await window.supabaseClient
            .from('users')
            .update({ name: newName })
            .eq('id', user.id);

        if (error) throw error;

        loadedDisplayName = newName;
        if (nameInput) {
            nameInput.value = newName;
            nameInput.readOnly = true;
            nameInput.classList.remove('is-editing');
        }
        updateSaveNameButton();
        window.toast?.success('Nombre actualizado correctamente.');
    } catch (error) {
        console.error('Error actualizando nombre:', error);
        window.toast?.error('Error al actualizar el nombre: ' + error.message);
    } finally {
        window.hideLoading();
    }
}

async function handleChangePassword(e) {
    e.preventDefault();
    window.showLoading();

    const user = window.getCurrentUser();
    if (!user || !window.supabaseClient) {
        window.toast?.error('Debes iniciar sesión para cambiar la contraseña.');
        window.hideLoading();
        return;
    }

    const newPassword = document.getElementById('opciones-new-password')?.value || '';
    const confirmPassword = document.getElementById('opciones-new-password-confirm')?.value || '';

    try {
        if (newPassword.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
        if (newPassword !== confirmPassword) throw new Error('Las contraseñas no coinciden.');

        const { error } = await window.supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;

        document.getElementById('change-password-form')?.reset();
        window.toast?.success('Contraseña actualizada.');
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        window.toast?.error(error.message || 'No se pudo cambiar la contraseña.');
    } finally {
        window.hideLoading();
    }
}

async function handleLogout(e) {
    e.preventDefault();
    if (!window.supabaseClient) return;

    window.showLoading();
    try {
        await window.supabaseClient.auth.signOut();
        document.getElementById('navbar').classList.add('hidden');
        window.navigateTo('login-view');
    } catch (error) {
        console.error('Error al salir', error);
    } finally {
        window.hideLoading();
    }
}
