(() => {
    "use strict";

    const WHATSAPP_NUMBER = "524881930989";
    const API_BASE_URL = "https://localhost:7210/api";
    const LOGIN_PAGE = 'index.html'; // página a la que se manda si no hay sesión

    // ==========================================
    // SISTEMA DE TOASTS PERSONALIZADOS
    // ==========================================
    function showToast(message, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    // ==========================================
    // MODAL DE CONFIRMACIÓN ELEGANTE
    // ==========================================
    function customConfirm(message) {
        return new Promise((resolve) => {
            const dialog = document.createElement('dialog');
            dialog.className = 'modal';
            dialog.style.padding = '2rem';
            dialog.style.borderRadius = 'var(--radius)';
            dialog.style.border = '1px solid var(--line)';
            dialog.style.boxShadow = 'var(--shadow-md)';
            dialog.style.maxWidth = '400px';
            dialog.style.textAlign = 'center';
            dialog.style.background = 'var(--white)';
            dialog.style.color = 'var(--ink)';
            dialog.style.zIndex = '9999';

            dialog.innerHTML = `
                <h3 style="margin-top: 0; color: var(--navy-900);">¿Estás seguro?</h3>
                <p style="color: var(--muted); margin-bottom: 1.5rem;">${message}</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn btn--outline" id="btn-confirm-no">Cancelar</button>
                    <button class="btn" style="background: #be123c; border-color: #be123c;" id="btn-confirm-yes">Sí, eliminar</button>
                </div>
            `;

            document.body.appendChild(dialog);
            dialog.showModal();

            dialog.querySelector('#btn-confirm-no').onclick = () => {
                dialog.close(); dialog.remove(); resolve(false);
            };
            dialog.querySelector('#btn-confirm-yes').onclick = () => {
                dialog.close(); dialog.remove(); resolve(true);
            };
        });
    }

    // ==========================================
    // INYECTAR EL HEADER DINÁMICAMENTE
    // ==========================================
    const headerContainer = document.getElementById("header-container");
    if (headerContainer) {
        fetch("header.html")
            .then(response => response.text())
            .then(data => {
                headerContainer.innerHTML = data;
                const header = document.querySelector(".site-header");
                const toggle = document.querySelector(".nav-toggle");
                const nav = document.querySelector("#primary-nav");
                const currentPath = window.location.pathname.split("/").pop() || "index.html";

                const navLinks = document.querySelectorAll(".site-nav__list a:not(.btn)");
                navLinks.forEach(link => {
                    if (link.getAttribute("href") === currentPath) {
                        link.setAttribute("aria-current", "page");
                    } else {
                        link.removeAttribute("aria-current");
                    }
                });

                if (toggle && nav) {
                    const setOpen = (open) => {
                        toggle.setAttribute("aria-expanded", String(open));
                        toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
                        nav.classList.toggle("is-open", open);
                    };
                    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
                    nav.addEventListener("click", (event) => { if (event.target.closest("a")) setOpen(false); });
                    document.addEventListener("keydown", (event) => { if (event.key === "Escape") setOpen(false); });
                }

                const onScroll = () => { if (header) header.classList.toggle("is-scrolled", window.scrollY > 8); };
                onScroll();
                window.addEventListener("scroll", onScroll, { passive: true });
            })
            .catch(error => console.error("Error cargando el header:", error));
    }

    // ==========================================
    // APARICIÓN DE ELEMENTOS AL HACER SCROLL
    // ==========================================
    const items = document.querySelectorAll("[data-reveal]");
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                });
            },
            { threshold: 0.12 }
        );

        items.forEach((el) => {
            const index = Array.prototype.indexOf.call(el.parentElement.children, el);
            el.style.setProperty("--delay", `${Math.min(index, 5) * 70}ms`);
            observer.observe(el);
        });
    } else {
        items.forEach((el) => el.classList.add("is-visible"));
    }

    // ==========================================
    // FORMULARIO DE WHATSAPP (Contact)
    // ==========================================
    const contactForm = document.querySelector("#contact-form");
    if (contactForm) {
        contactForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const data = new FormData(contactForm);
            const lines = ["Hola, me gustaría solicitar información."];

            if (data.get("name")) lines.push(`Nombre: ${data.get("name")}`);
            if (data.get("phone")) lines.push(`Teléfono: ${data.get("phone")}`);
            if (data.get("service")) lines.push(`Servicio de interés: ${data.get("service")}`);
            if (data.get("message")) lines.push(`Mensaje: ${data.get("message")}`);

            const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
            window.open(url, "_blank", "noopener");
        });
    }

    // ==========================================
    // SISTEMA: LOGIN AL API
    // ==========================================
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const peticion = await fetch(`${API_BASE_URL}/user/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, password: password })
                });

                const respuesta = await peticion.json();

                if (respuesta.result === 1) {
                    showToast('¡Hola! Iniciando sesión...', 'success');
                    localStorage.setItem('user', JSON.stringify(respuesta.data));
                    setTimeout(() => window.location.href = 'dashboard.html', 1000);
                } else {
                    showToast('El correo o la contraseña no coinciden. Por favor, verifica tus datos.', 'error');
                }
            } catch (error) {
                console.error('Error de conexión:', error);
                showToast('Parece que hay un problema de conexión. Por favor, intenta de nuevo en unos minutos.', 'error');
            }
        });
    }

    // ==========================================
    // SISTEMA: DASHBOARD (UTILIDADES GENERALES)
    // ==========================================
    function getUser() {
        try { return JSON.parse(localStorage.getItem('user')); }
        catch { return null; }
    }

    // Rol según el roleName que devuelve el login: 'admin' | 'doctor' | 'patient'
    function getRol() {
        const nombre = ((getUser() || {}).roleName || '').toLowerCase();
        if (nombre.includes('admin')) return 'admin';
        if (nombre.includes('doctor') || nombre.includes('medico') || nombre.includes('médico')) return 'doctor';
        return 'patient'; // cualquier otro rol o rol desconocido solo ve lo suyo
    }

    function esAdmin() {
        return getRol() === 'admin';
    }

    // Oculta lo que solo debe ver el administrador
    function aplicarRol() {
        if (esAdmin()) return;

        ['pacientes', 'doctores'].forEach(id => {
            const seccion = document.getElementById(id);
            if (seccion) seccion.hidden = true;

            const enlace = document.querySelector(`.site-nav__list a[href="#${id}"]`);
            if (enlace && enlace.parentElement) enlace.parentElement.hidden = true;
        });

        const btnNueva = document.getElementById('btn-new-appointment');
        if (btnNueva) btnNueva.hidden = true;

        const ayuda = document.querySelector('#calendario .card-head p');
        if (ayuda) {
            ayuda.textContent = getRol() === 'doctor'
                ? 'Estas son las citas que tienes agendadas.'
                : 'Estas son tus citas.';
        }
    }

    function parseApiDate(value) {
        const hasZone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(value);
        return new Date(hasZone ? value : value + 'Z');
    }

    function toInputLocal(d) {
        const p = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    }

    async function apiFetch(ruta, { method = 'GET', body } = {}) {
        const opciones = { method, headers: {} };
        if (body !== undefined) {
            opciones.headers['Content-Type'] = 'application/json';
            opciones.body = JSON.stringify(body);
        }
        try {
            const peticion = await fetch(`${API_BASE_URL}${ruta}`, opciones);
            if (!peticion.ok) return { result: 0, msg: 'Error de servidor. Revisa el backend.' };
            return await peticion.json();
        } catch (error) {
            return { result: -1, msg: 'Fallo de red. El servidor no responde.' };
        }
    }

    function mensajeDeError(respuesta, porDefecto) {
        if (respuesta && respuesta.data && typeof respuesta.data === 'object' && !Array.isArray(respuesta.data)) {
            const primero = Object.values(respuesta.data)[0];
            if (Array.isArray(primero) && primero.length) return primero[0];
        }
        return (respuesta && respuesta.msg) || porDefecto;
    }

    function botonEnvio(evento, formulario) {
        return evento.submitter || formulario.querySelector('button[type="submit"]');
    }

    async function guardarRegistro({ boton, ruta, metodo, cuerpo, dialogo, mensajeOk, recargar }) {
        boton.disabled = true;
        const respuesta = await apiFetch(ruta, { method: metodo, body: cuerpo });

        if (respuesta.result === 1) {
            showToast(mensajeOk, 'success');
            dialogo.close();
            recargar();
        } else {
            showToast(mensajeDeError(respuesta, 'No se pudo guardar. Intenta de nuevo.'), 'error');
        }
        boton.disabled = false;
    }

    async function eliminarRegistro({ ruta, confirmacion, mensajeOk, recargar }) {
        const confirmado = await customConfirm(confirmacion);
        if (!confirmado) return false;

        const respuesta = await apiFetch(ruta, { method: 'DELETE' });

        if (respuesta.result === 1) {
            showToast(mensajeOk, 'success');
            recargar();
            return true;
        }
        showToast(mensajeDeError(respuesta, 'No se pudo eliminar el registro. Intenta de nuevo.'), 'error');
        return false;
    }

    function iniciarSesionUsuario() {
        const user = getUser();
        if (!user) {
            window.location.href = LOGIN_PAGE;
            return false;
        }

        const nameEl = document.getElementById('user-name');
        const roleEl = document.getElementById('user-role');
        if (nameEl) nameEl.textContent = `Bienvenido, ${user.fullName || user.email}`;
        if (roleEl) roleEl.textContent = `Rol: ${user.roleName || 'Usuario'}`;

        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) btnLogout.addEventListener('click', () => localStorage.removeItem('user'));

        const enlaces = document.querySelectorAll('.site-nav__list a[href^="#"]');
        enlaces.forEach(enlace => enlace.addEventListener('click', () => {
            enlaces.forEach(a => a.removeAttribute('aria-current'));
            enlace.setAttribute('aria-current', 'page');
        }));

        return true;
    }

    function activarDialogos() {
        document.querySelectorAll('dialog.modal').forEach(dialogo => {
            dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });
            dialogo.querySelectorAll('[data-close]').forEach(btn =>
                btn.addEventListener('click', () => dialogo.close()));
        });
    }

    function configurarCamposDeAlta(form, editando) {
        form.querySelectorAll('[data-create-only]').forEach(bloque => {
            bloque.hidden = editando;
            bloque.querySelectorAll('input').forEach(input => { input.disabled = editando; });
        });
    }

    // ---------- CALENDARIO Y CITAS ----------
    const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    let fechaCalendarioActual = new Date();
    let citaEditandoId = null;

    function claveDia(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    async function cargarCalendario() {
        const grid = document.getElementById('calendar-grid');
        const monthLabel = document.getElementById('calendar-month-label');
        if (!grid) return;

        if (monthLabel) {
            monthLabel.textContent = fechaCalendarioActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        }

        const año = fechaCalendarioActual.getFullYear();
        const mes = fechaCalendarioActual.getMonth();
        const primerDia = new Date(año, mes, 1);
        const ultimoDia = new Date(año, mes + 1, 0);
        let diaInicioSemana = primerDia.getDay();

        let citas = [];
        // Admin ve todas las citas; doctor y paciente solo las suyas
        let ruta = '/appointment?PageNumber=1&PageSize=100';
        if (!esAdmin()) {
            ruta += `&IdUser=${encodeURIComponent(getUser().id)}`;
        }
        const respuesta = await apiFetch(ruta);
        if (respuesta.result === 1) citas = respuesta.data || [];

        const porDia = {};
        citas.forEach(cita => {
            const fecha = parseApiDate(cita.appointmentDate);
            const clave = claveDia(fecha);
            if (!porDia[clave]) porDia[clave] = [];
            porDia[clave].push({ fecha, cita });
        });

        grid.innerHTML = '';
        DIAS.forEach(d => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = d;
            grid.appendChild(header);
        });

        for (let i = 0; i < diaInicioSemana; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-cell';
            emptyCell.style.border = 'none';
            emptyCell.style.background = 'transparent';
            grid.appendChild(emptyCell);
        }

        const hoy = claveDia(new Date());
        for (let i = 1; i <= ultimoDia.getDate(); i++) {
            const d = new Date(año, mes, i);
            const clave = claveDia(d);

            const cell = document.createElement('div');
            cell.className = 'calendar-cell' + (clave === hoy ? ' is-today' : '');

            const dayNum = document.createElement('strong');
            dayNum.textContent = i;
            cell.appendChild(dayNum);

            if (clave === hoy) {
                const spanHoy = document.createElement('span');
                spanHoy.textContent = ' Hoy';
                spanHoy.style.color = 'var(--teal-600)';
                spanHoy.style.fontSize = '0.7rem';
                cell.appendChild(spanHoy);
            }

            (porDia[clave] || [])
                .sort((a, b) => a.fecha - b.fecha)
                .forEach(({ fecha, cita }) => {
                    const badge = document.createElement('span');
                    badge.className = 'appointment-badge';

                    const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
                    const nombre = getRol() === 'patient'
                        ? (cita.doctorName ? `Dr(a). ${cita.doctorName}` : 'Doctor')
                        : (cita.patientName || 'Paciente');
                    badge.textContent = `${hora} - ${nombre}`;

                    if (esAdmin()) {
                        badge.tabIndex = 0;
                        badge.setAttribute('role', 'button');
                        badge.title = 'Editar o eliminar cita';
                        badge.addEventListener('click', () => abrirCita(cita));
                        badge.addEventListener('keydown', (e) => { if (e.key === 'Enter') abrirCita(cita); });
                    } else {
                        badge.style.cursor = 'default';
                    }

                    cell.appendChild(badge);
                });

            grid.appendChild(cell);
        }
    }

    // Funciones de apoyo para crear y editar Citas
    function llenarSelect(select, respuesta, etiqueta, placeholder) {
        select.innerHTML = '';
        select.add(new Option(placeholder, ''));
        if (respuesta.result === 1 && respuesta.data) {
            respuesta.data.forEach(item => select.add(new Option(etiqueta(item), String(item.id))));
        }
    }

    async function abrirCita(cita = null) {
        const dialogo = document.getElementById('dlg-appointment');
        const form = document.getElementById('form-appointment');
        const editando = cita !== null;

        citaEditandoId = editando ? cita.id : null;
        form.reset();
        document.getElementById('dlg-appointment-title').textContent = editando ? 'Editar cita' : 'Nueva cita';
        document.getElementById('btn-appointment-delete').hidden = !editando;

        form.elements.idPatient.disabled = editando;
        form.elements.idDoctor.disabled = editando;

        try {
            const [pacientes, doctores] = await Promise.all([
                apiFetch('/patient?PageNumber=1&PageSize=100'),
                apiFetch('/doctor?PageNumber=1&PageSize=100')
            ]);
            llenarSelect(form.elements.idPatient, pacientes, p => `${p.firstName} ${p.lastName}`, 'Selecciona un paciente');
            llenarSelect(form.elements.idDoctor, doctores, d => `Dr(a). ${d.firstName} ${d.lastName}`, 'Selecciona un doctor');
        } catch (error) {
            console.error('Error al cargar pacientes y doctores:', error);
            showToast('No se pudieron cargar los pacientes y doctores. Intenta de nuevo.', 'error');
            return;
        }

        form.elements.appointmentDate.min = toInputLocal(new Date());

        if (editando) {
            form.elements.idPatient.value = String(cita.idPatient);
            form.elements.idDoctor.value = String(cita.idDoctor);
            form.elements.appointmentDate.value = toInputLocal(parseApiDate(cita.appointmentDate));
            form.elements.reason.value = cita.reason || '';
        }

        dialogo.showModal();
    }


    // ---------- PACIENTES ----------
    let pacienteEditandoId = null;

    function abrirPaciente(paciente = null) {
        const dialogo = document.getElementById('dlg-patient');
        const form = document.getElementById('form-patient');
        const editando = paciente !== null;

        pacienteEditandoId = editando ? paciente.id : null;
        form.reset();
        document.getElementById('dlg-patient-title').textContent = editando ? 'Editar paciente' : 'Nuevo paciente';
        configurarCamposDeAlta(form, editando);

        form.elements.birthDate.max = toInputLocal(new Date()).substring(0, 10);

        if (editando) {
            form.elements.firstName.value = paciente.firstName;
            form.elements.lastName.value = paciente.lastName;
            form.elements.phone.value = paciente.phone || '';
            form.elements.birthDate.value = paciente.birthDate ? paciente.birthDate.substring(0, 10) : '';
        }

        dialogo.showModal();
    }

    function borrarPaciente(id) {
        return eliminarRegistro({
            ruta: `/patient/${id}`,
            confirmacion: '¿Estás seguro de que deseas eliminar este paciente? También se desactivará su usuario.',
            mensajeOk: 'El paciente se ha eliminado correctamente.',
            recargar: cargarPacientes
        });
    }

    async function cargarPacientes() {
        const tbody = document.querySelector('#patient-table tbody');
        const template = document.getElementById('patient-row-template');

        if (!tbody || !template) return;

        try {
            const respuesta = await apiFetch('/patient?PageNumber=1&PageSize=50');

            if (respuesta.result === 1) {
                tbody.innerHTML = '';
                const data = respuesta.data || [];

                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay pacientes registrados.</td></tr>';
                    return;
                }

                data.forEach(paciente => {
                    const fila = template.content.cloneNode(true);
                    const birth = paciente.birthDate ? paciente.birthDate.substring(0, 10) : 'N/A';

                    fila.querySelector('.col-id').textContent = `#${paciente.id}`;
                    fila.querySelector('.col-name strong').textContent = `${paciente.firstName} ${paciente.lastName}`;
                    fila.querySelector('.col-phone').textContent = paciente.phone || 'N/A';
                    fila.querySelector('.col-date').textContent = birth;

                    fila.querySelector('.btn-edit').addEventListener('click', () => abrirPaciente(paciente));
                    fila.querySelector('.btn-delete').addEventListener('click', () => borrarPaciente(paciente.id));

                    tbody.appendChild(fila);
                });
            }
        } catch (error) {
            showToast('Tuvimos un problema al cargar la lista de pacientes.', 'error');
        }
    }


    // ---------- DOCTORES ----------
    let doctorEditandoId = null;

    function abrirDoctor(doctor = null) {
        const dialogo = document.getElementById('dlg-doctor');
        const form = document.getElementById('form-doctor');
        const editando = doctor !== null;

        doctorEditandoId = editando ? doctor.id : null;
        form.reset();
        document.getElementById('dlg-doctor-title').textContent = editando ? 'Editar doctor' : 'Nuevo doctor';
        configurarCamposDeAlta(form, editando);

        if (editando) {
            form.elements.firstName.value = doctor.firstName;
            form.elements.lastName.value = doctor.lastName;
            form.elements.licenseNumber.value = doctor.licenseNumber;
        }

        dialogo.showModal();
    }

    function borrarDoctor(id) {
        return eliminarRegistro({
            ruta: `/doctor/${id}`,
            confirmacion: '¿Estás seguro de que deseas eliminar este doctor? También se desactivará su usuario.',
            mensajeOk: 'El doctor se ha eliminado correctamente.',
            recargar: cargarDoctores
        });
    }

    async function cargarDoctores() {
        const tbody = document.querySelector('#doctor-table tbody');
        const template = document.getElementById('doctor-row-template');

        if (!tbody || !template) return;

        try {
            const respuesta = await apiFetch('/doctor?PageNumber=1&PageSize=50');

            if (respuesta.result === 1) {
                tbody.innerHTML = '';
                const data = respuesta.data || [];

                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay doctores registrados.</td></tr>';
                    return;
                }

                data.forEach(doctor => {
                    const fila = template.content.cloneNode(true);

                    fila.querySelector('.col-id').textContent = `#${doctor.id}`;
                    fila.querySelector('.col-name strong').textContent = `${doctor.firstName} ${doctor.lastName}`;
                    fila.querySelector('.col-license').textContent = doctor.licenseNumber;

                    fila.querySelector('.btn-edit').addEventListener('click', () => abrirDoctor(doctor));
                    fila.querySelector('.btn-delete').addEventListener('click', () => borrarDoctor(doctor.id));

                    tbody.appendChild(fila);
                });
            }
        } catch (error) {
            showToast('Tuvimos un problema al cargar la lista de doctores.', 'error');
        }
    }

    // ---------- CONEXIÓN DE LOS FORMULARIOS POST/PUT ----------
    function configurarFormularios() {
        document.getElementById('btn-new-appointment')?.addEventListener('click', () => abrirCita());
        document.getElementById('btn-new-patient')?.addEventListener('click', () => abrirPaciente());
        document.getElementById('btn-new-doctor')?.addEventListener('click', () => abrirDoctor());

        // --- Formulario Paciente ---
        const formPaciente = document.getElementById('form-patient');
        if (formPaciente) {
            formPaciente.addEventListener('submit', (e) => {
                e.preventDefault();
                const f = formPaciente.elements;
                const editando = pacienteEditandoId !== null;

                const cuerpo = {
                    firstName: f.firstName.value.trim(),
                    lastName: f.lastName.value.trim(),
                    phone: f.phone.value.trim() || null,
                    birthDate: f.birthDate.value || null
                };
                if (!editando) {
                    cuerpo.email = f.email.value.trim();
                    cuerpo.password = f.password.value;
                }

                guardarRegistro({
                    boton: botonEnvio(e, formPaciente),
                    ruta: editando ? `/patient/${pacienteEditandoId}` : '/patient',
                    metodo: editando ? 'PUT' : 'POST',
                    cuerpo,
                    dialogo: document.getElementById('dlg-patient'),
                    mensajeOk: editando ? 'El paciente se actualizó correctamente.' : 'El paciente se creó correctamente.',
                    recargar: cargarPacientes
                });
            });
        }

        // --- Formulario Doctor ---
        const formDoctor = document.getElementById('form-doctor');
        if (formDoctor) {
            formDoctor.addEventListener('submit', (e) => {
                e.preventDefault();
                const f = formDoctor.elements;
                const editando = doctorEditandoId !== null;

                const cuerpo = {
                    firstName: f.firstName.value.trim(),
                    lastName: f.lastName.value.trim(),
                    licenseNumber: f.licenseNumber.value.trim()
                };
                if (!editando) {
                    cuerpo.email = f.email.value.trim();
                    cuerpo.password = f.password.value;
                }

                guardarRegistro({
                    boton: botonEnvio(e, formDoctor),
                    ruta: editando ? `/doctor/${doctorEditandoId}` : '/doctor',
                    metodo: editando ? 'PUT' : 'POST',
                    cuerpo,
                    dialogo: document.getElementById('dlg-doctor'),
                    mensajeOk: editando ? 'El doctor se actualizó correctamente.' : 'El doctor se creó correctamente.',
                    recargar: cargarDoctores
                });
            });
        }

        // --- Formulario Cita ---
        const formCita = document.getElementById('form-appointment');
        if (formCita) {
            formCita.addEventListener('submit', (e) => {
                e.preventDefault();
                const f = formCita.elements;
                const editando = citaEditandoId !== null;

                const fechaUtc = new Date(f.appointmentDate.value).toISOString();
                const reason = f.reason.value.trim() || null;

                const cuerpo = editando
                    ? { appointmentDate: fechaUtc, reason }
                    : { idPatient: Number(f.idPatient.value), idDoctor: Number(f.idDoctor.value), appointmentDate: fechaUtc, reason };

                guardarRegistro({
                    boton: botonEnvio(e, formCita),
                    ruta: editando ? `/appointment/${citaEditandoId}` : '/appointment',
                    metodo: editando ? 'PUT' : 'POST',
                    cuerpo,
                    dialogo: document.getElementById('dlg-appointment'),
                    mensajeOk: editando ? 'La cita se actualizó correctamente.' : 'La cita se creó correctamente.',
                    recargar: cargarCalendario
                });
            });
        }

        // Eliminar cita desde dentro del formulario
        const btnEliminarCita = document.getElementById('btn-appointment-delete');
        if (btnEliminarCita) {
            btnEliminarCita.addEventListener('click', async () => {
                const eliminada = await eliminarRegistro({
                    ruta: `/appointment/${citaEditandoId}`,
                    confirmacion: '¿Estás seguro de que deseas eliminar esta cita?',
                    mensajeOk: 'La cita se ha eliminado correctamente.',
                    recargar: cargarCalendario
                });
                if (eliminada) document.getElementById('dlg-appointment').close();
            });
        }
    }

    // ---------- ARRANQUE DE LA APP ----------
    document.addEventListener('DOMContentLoaded', () => {
        // Solo ejecuta la lógica del Dashboard si existe el calendario en la página
        if (!document.getElementById('calendar-grid')) return;

        // Valida que el usuario tenga sesión
        if (!iniciarSesionUsuario()) return;

        activarDialogos();
        configurarFormularios();

        // Botones para navegar por los meses del calendario
        const btnPrev = document.getElementById('btn-prev-month');
        const btnNext = document.getElementById('btn-next-month');
        if (btnPrev) btnPrev.addEventListener('click', () => {
            fechaCalendarioActual.setMonth(fechaCalendarioActual.getMonth() - 1);
            cargarCalendario();
        });
        if (btnNext) btnNext.addEventListener('click', () => {
            fechaCalendarioActual.setMonth(fechaCalendarioActual.getMonth() + 1);
            cargarCalendario();
        });

        // Carga de datos inicial
        cargarCalendario();
        if (esAdmin()) {
            cargarPacientes();
            cargarDoctores();
        }
    });

})();