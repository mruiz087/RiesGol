// js/opciones.js
// Lógica para la pestaña de opciones: cambio de nombre y logout

let loadedDisplayName = '';

document.addEventListener('DOMContentLoaded', () => {
    const changeNameForm = document.getElementById('change-name-form');
    const logoutBtn = document.getElementById('logout-btn');
    const nameInput = document.getElementById('new-name');
    const saveBtn = document.getElementById('save-name-btn');

    if (changeNameForm) {
        changeNameForm.addEventListener('submit', handleChangeName);
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
            // Si no hay cambios, volver a modo lectura con el nombre guardado
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
});

function updateSaveNameButton() {
    const nameInput = document.getElementById('new-name');
    const saveBtn = document.getElementById('save-name-btn');
    if (!nameInput || !saveBtn) return;

    const next = nameInput.value.trim();
    const canSave = !nameInput.readOnly && next.length > 0 && next !== loadedDisplayName;
    saveBtn.disabled = !canSave;
}

window.loadOpciones = async function () {
    const nameInput = document.getElementById('new-name');
    if (!nameInput) return;

    const user = window.getCurrentUser?.() || window.currentUser;
    if (!user || !window.supabaseClient) {
        loadedDisplayName = '';
        nameInput.value = '';
        nameInput.readOnly = true;
        nameInput.classList.remove('is-editing');
        updateSaveNameButton();
        return;
    }

    try {
        const { data, error } = await window.supabaseClient
            .from('users')
            .select('name')
            .eq('id', user.id)
            .maybeSingle();

        if (error) throw error;

        loadedDisplayName = (data?.name || user.email?.split('@')[0] || '').trim();
        nameInput.value = loadedDisplayName;
        nameInput.readOnly = true;
        nameInput.classList.remove('is-editing');
        updateSaveNameButton();
    } catch (err) {
        console.error('Error cargando nombre de usuario:', err);
        loadedDisplayName = '';
        nameInput.value = '';
        nameInput.placeholder = 'No se pudo cargar el nombre';
        updateSaveNameButton();
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
