// js/opciones.js
// Lógica para la pestaña de opciones: cambio de nombre y logout

document.addEventListener('DOMContentLoaded', () => {
    const changeNameForm = document.getElementById('change-name-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (changeNameForm) {
        changeNameForm.addEventListener('submit', handleChangeName);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

async function handleChangeName(e) {
    e.preventDefault();
    window.showLoading();

    const user = window.getCurrentUser();
    if (!user || !window.supabaseClient) {
        alert("Debes iniciar sesión para cambiar tu nombre.");
        window.hideLoading();
        return;
    }

    const newName = document.getElementById('new-name').value.trim();

    if (!newName) {
        alert("Por favor, introduce un nombre válido.");
        window.hideLoading();
        return;
    }

    try {
        const { error } = await window.supabaseClient
            .from('users')
            .update({ name: newName })
            .eq('id', user.id);

        if (error) throw error;

        alert("Nombre actualizado correctamente.");
        document.getElementById('new-name').value = '';

    } catch (error) {
        console.error("Error actualizando nombre:", error);
        alert("Error al actualizar el nombre: " + error.message);
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
        console.error("Error al salir", error);
    } finally {
        window.hideLoading();
    }
}
