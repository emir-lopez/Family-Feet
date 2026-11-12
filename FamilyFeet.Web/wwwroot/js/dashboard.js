(() => {
    "use strict";

    // ==========================================
    // CONFIGURACIÓN
    // ==========================================
    const API_BASE_URL = "https://localhost:7210/api";
    const LOGIN_PAGE = "index.html"; // página a la que se envía al usuario sin sesión o al cerrar sesión
    const MAX_CITAS_POR_DIA = 3;

    // Qué puede hacer cada rol. Ajusta aquí si cambian las reglas.
    const PERMISOS = {
        admin: { vistas: ["agenda", "pacientes", "doctores"], crearCita: true, editarCita: true, eliminarCita: true },
        doctor: { vistas: ["agenda"], crearCita: true, editarCita: true, eliminarCita: false },
        patient: { vistas: ["agenda"], crearCita: false, editarCita: false, eliminarCita: false }
    };

    const NOMBRE_DE_ROL = { admin: "Administrador", doctor: "Doctor", patient: "Paciente" };

    const VISTAS = {
        agenda: { titulo: "Agenda", subtitulo: "", accion: "Nueva cita" },
        pacientes: { titulo: "Pacientes", subtitulo: "Altas, bajas y datos de contacto de los pacientes.", accion: "Nuevo paciente" },
        doctores: { titulo: "Doctores", subtitulo: "Personal médico registrado en el sistema.", accion: "Nuevo doctor" }
    };

    // ==========================================
    // SESIÓN Y ROL
    // ==========================================
    function leerUsuario() {
        try { return JSON.parse(localStorage.getItem("user")); }
        catch { return null; }
    }

    // Según el roleName que devuelve el login. Un rol desconocido solo ve lo suyo.
    function rolDe(user) {
        const nombre = String(user.roleName || "").toLowerCase();
        if (nombre.includes("admin")) return "admin";
        if (nombre.includes("doctor") || nombre.includes("medico") || nombre.includes("médico")) return "doctor";
        return "patient";
    }

    const usuario = leerUsuario();
    if (!usuario) {
        window.location.replace(LOGIN_PAGE);
        return;
    }

    const rol = rolDe(usuario);
    const permisos = PERMISOS[rol];

    function subtituloAgenda() {
        if (rol === "admin") return "Citas de todos los doctores. Selecciona un día para agendar una cita.";
        if (rol === "doctor") return "Tus citas programadas. Selecciona un día para agendar una nueva.";
        return "Tus citas programadas.";
    }

    // ==========================================
    // ESTADO
    // ==========================================
    const estado = {
        vista: "agenda",
        mes: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        citas: [],
        tokenCitas: 0,
        citaEditando: null,
        pacientes: { pagina: 1, tam: 10, busqueda: "", total: 0, editando: null },
        doctores: { pagina: 1, tam: 10, busqueda: "", total: 0, editando: null }
    };

    // ==========================================
    // UTILIDADES
    // ==========================================
    const $ = (id) => document.getElementById(id);
    const pad = (n) => String(n).padStart(2, "0");
    const claveDia = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const horaTexto = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

    function fijarTexto(id, valor) {
        const elemento = $(id);
        if (elemento) elemento.textContent = valor;
    }

    // El API guarda las fechas en UTC; si llegan sin "Z" se la agregamos.
    function parseApiDate(valor) {
        const conZona = /[zZ]$|[+-]\d{2}:\d{2}$/.test(valor);
        return new Date(conZona ? valor : valor + "Z");
    }

    function fechaCorta(iso) { // "1990-05-10" -> "10/05/1990"
        const [anio, mes, dia] = iso.substring(0, 10).split("-");
        return `${dia}/${mes}/${anio}`;
    }

    function fechaLarga(d) {
        return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
    }

    function iniciales(texto) {
        const partes = String(texto).replace(/@.*/, "").trim().split(/\s+/).filter(Boolean);
        if (partes.length === 0) return "?";
        const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
        return (partes[0][0] + ultima).toUpperCase();
    }

    function siguienteHora() {
        const d = new Date();
        d.setMinutes(0, 0, 0);
        d.setHours(d.getHours() + 1);
        return d;
    }

    // Nombre que se muestra en cada cita: el paciente ve al doctor; el resto ve al paciente.
    function nombreEnCita(cita) {
        if (rol === "patient") return cita.doctorName ? `Dr(a). ${cita.doctorName}` : "Doctor";
        return cita.patientName || "Paciente";
    }

    // ==========================================
    // API
    // ==========================================
    async function api(ruta, { method = "GET", body } = {}) {
        const opciones = { method, headers: {} };
        if (body !== undefined) {
            opciones.headers["Content-Type"] = "application/json";
            opciones.body = JSON.stringify(body);
        }

        try {
            const respuesta = await fetch(`${API_BASE_URL}${ruta}`, opciones);
            try {
                return await respuesta.json();
            } catch {
                return { result: -1, msg: "El servidor devolvió una respuesta no válida.", data: null, count: 0 };
            }
        } catch {
            return { result: -1, msg: "No se pudo conectar con el servidor.", data: null, count: 0 };
        }
    }

    // Si el API devolvió errores de validación muestra el primero; si no, el mensaje general.
    function mensajeDeError(respuesta, porDefecto) {
        if (respuesta && respuesta.data && typeof respuesta.data === "object" && !Array.isArray(respuesta.data)) {
            const primero = Object.values(respuesta.data)[0];
            if (Array.isArray(primero) && primero.length) return primero[0];
        }
        return (respuesta && respuesta.msg) || porDefecto;
    }

    // ==========================================
    // AVISOS Y CONFIRMACIÓN
    // ==========================================
    function aviso(mensaje, tipo = "success") {
        const toast = document.createElement("div");
        toast.className = `toast toast--${tipo}`;
        toast.setAttribute("role", tipo === "error" ? "alert" : "status");
        toast.textContent = mensaje;
        $("toasts").appendChild(toast);

        requestAnimationFrame(() => toast.classList.add("is-visible"));
        setTimeout(() => {
            toast.classList.remove("is-visible");
            setTimeout(() => toast.remove(), 300);
        }, 4500);
    }

    function confirmar({ titulo, mensaje, aceptar = "Eliminar" }) {
        return new Promise((resolver) => {
            const dialogo = $("dlg-confirm");
            const botonAceptar = $("confirm-accept");
            const botonCancelar = $("confirm-cancel");
            let resultado = false;

            $("confirm-title").textContent = titulo;
            $("confirm-message").textContent = mensaje;
            botonAceptar.textContent = aceptar;

            const alAceptar = () => { resultado = true; dialogo.close(); };
            const alCancelar = () => dialogo.close();
            const alCerrar = () => {
                botonAceptar.removeEventListener("click", alAceptar);
                botonCancelar.removeEventListener("click", alCancelar);
                dialogo.removeEventListener("close", alCerrar);
                resolver(resultado);
            };

            botonAceptar.addEventListener("click", alAceptar);
            botonCancelar.addEventListener("click", alCancelar);
            dialogo.addEventListener("close", alCerrar);
            dialogo.showModal();
        });
    }

    async function guardar({ boton, ruta, metodo, cuerpo, dialogo, mensajeOk, despues }) {
        if (boton) boton.disabled = true;
        const respuesta = await api(ruta, { method: metodo, body: cuerpo });
        if (boton) boton.disabled = false;

        if (respuesta.result === 1) {
            aviso(mensajeOk);
            dialogo.close();
            despues();
        } else {
            aviso(mensajeDeError(respuesta, "No se pudo guardar. Intenta de nuevo."), "error");
        }
    }

    async function eliminar({ ruta, titulo, mensaje, mensajeOk, despues }) {
        const confirmado = await confirmar({ titulo, mensaje });
        if (!confirmado) return false;

        const respuesta = await api(ruta, { method: "DELETE" });
        if (respuesta.result === 1) {
            aviso(mensajeOk);
            despues();
            return true;
        }

        aviso(mensajeDeError(respuesta, "No se pudo eliminar el registro."), "error");
        return false;
    }

    function activarDialogos() {
        document.querySelectorAll("dialog.app-modal").forEach((dialogo) => {
            dialogo.addEventListener("click", (e) => { if (e.target === dialogo) dialogo.close(); });
            dialogo.querySelectorAll("[data-close]").forEach((boton) =>
                boton.addEventListener("click", () => dialogo.close()));
        });
    }

    // ==========================================
    // AGENDA
    // ==========================================
    async function pedirCitasDelMes() {
        const inicio = new Date(estado.mes.getFullYear(), estado.mes.getMonth(), 1);
        const fin = new Date(estado.mes.getFullYear(), estado.mes.getMonth() + 1, 1);

        let ruta = "/appointment?PageSize=100"
            + `&DateFrom=${encodeURIComponent(inicio.toISOString())}`
            + `&DateTo=${encodeURIComponent(new Date(fin.getTime() - 1000).toISOString())}`;

        // Admin ve todas las citas; doctor y paciente solo las suyas
        if (rol !== "admin") ruta += `&IdUser=${encodeURIComponent(usuario.id)}`;

        let citas = [];
        let pagina = 1;
        let total = 0;

        do {
            const respuesta = await api(`${ruta}&PageNumber=${pagina}`);
            if (respuesta.result !== 1) {
                aviso(mensajeDeError(respuesta, "No se pudieron cargar las citas."), "error");
                break;
            }
            citas = citas.concat(respuesta.data || []);
            total = respuesta.count;
            pagina += 1;
        } while (citas.length < total && pagina <= 10);

        return citas;
    }

    async function cargarAgenda() {
        const token = ++estado.tokenCitas;
        const grid = $("calendar-grid");

        fijarTexto("calendar-month-label", mayuscula(estado.mes.toLocaleDateString("es-MX", { month: "long", year: "numeric" })));
        grid.setAttribute("aria-busy", "true");

        const citas = await pedirCitasDelMes();
        if (token !== estado.tokenCitas) return; // llegó una consulta más reciente

        estado.citas = citas.map((c) => ({ ...c, fecha: parseApiDate(c.appointmentDate) }));
        grid.removeAttribute("aria-busy");

        pintarCalendario();
        pintarListaDelMes();
        pintarResumen();
    }

    function crearChip(cita) {
        const interactivo = permisos.editarCita;
        const chip = document.createElement(interactivo ? "button" : "div");
        chip.className = "chip" + (cita.fecha < new Date() ? " is-past" : "");
        chip.title = `${horaTexto(cita.fecha)} - ${nombreEnCita(cita)}` + (cita.reason ? ` - ${cita.reason}` : "");

        if (interactivo) {
            chip.type = "button";
            chip.addEventListener("click", (e) => {
                e.stopPropagation();
                abrirCita({ cita });
            });
        }

        const hora = document.createElement("span");
        hora.className = "chip__time";
        hora.textContent = horaTexto(cita.fecha);

        const nombre = document.createElement("span");
        nombre.className = "chip__name";
        nombre.textContent = nombreEnCita(cita);

        chip.append(hora, nombre);
        return chip;
    }

    function pintarCalendario() {
        const grid = $("calendar-grid");
        grid.replaceChildren();

        const anio = estado.mes.getFullYear();
        const mes = estado.mes.getMonth();
        const diasDelMes = new Date(anio, mes + 1, 0).getDate();
        const desfase = (new Date(anio, mes, 1).getDay() + 6) % 7; // la semana inicia en lunes
        const hoy = new Date();
        const claveHoy = claveDia(hoy);
        const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

        const porDia = {};
        estado.citas.forEach((cita) => {
            const clave = claveDia(cita.fecha);
            if (!porDia[clave]) porDia[clave] = [];
            porDia[clave].push(cita);
        });

        for (let i = 0; i < desfase; i++) {
            const vacia = document.createElement("div");
            vacia.className = "cal__cell cal__cell--empty";
            vacia.setAttribute("aria-hidden", "true");
            grid.appendChild(vacia);
        }

        for (let dia = 1; dia <= diasDelMes; dia++) {
            const fecha = new Date(anio, mes, dia);
            const clave = claveDia(fecha);
            const esPasado = fecha < inicioDeHoy;
            const citas = (porDia[clave] || []).sort((a, b) => a.fecha - b.fecha);

            const celda = document.createElement("div");
            celda.className = "cal__cell" + (clave === claveHoy ? " is-today" : "") + (esPasado ? " is-past" : "");

            const numero = document.createElement("span");
            numero.className = "cal__day";
            numero.textContent = dia;
            celda.appendChild(numero);

            citas.slice(0, MAX_CITAS_POR_DIA).forEach((cita) => celda.appendChild(crearChip(cita)));

            if (citas.length > MAX_CITAS_POR_DIA) {
                const mas = document.createElement("span");
                mas.className = "cal__more";
                mas.textContent = `+${citas.length - MAX_CITAS_POR_DIA} más`;
                celda.appendChild(mas);
            }

            if (permisos.crearCita) {
                const agendar = () => {
                    if (esPasado) {
                        aviso("No se pueden agendar citas en fechas pasadas.", "info");
                        return;
                    }
                    abrirCita({ fecha });
                };

                celda.classList.add("is-clickable");
                celda.tabIndex = 0;
                celda.title = `Agendar cita el ${fechaLarga(fecha)}`;
                celda.addEventListener("click", agendar);
                celda.addEventListener("keydown", (e) => {
                    if ((e.key === "Enter" || e.key === " ") && e.target === celda) {
                        e.preventDefault();
                        agendar();
                    }
                });
            }

            grid.appendChild(celda);
        }
    }

    function pintarListaDelMes() {
        fijarTexto("month-list-title", `Citas de ${estado.mes.toLocaleDateString("es-MX", { month: "long" })}`);

        const lista = $("month-list");
        lista.replaceChildren();

        if (estado.citas.length === 0) {
            const vacio = document.createElement("li");
            vacio.className = "appt-list__empty";
            vacio.textContent = "No hay citas programadas en este mes.";
            lista.appendChild(vacio);
            return;
        }

        const ahora = new Date();

        [...estado.citas].sort((a, b) => a.fecha - b.fecha).forEach((cita) => {
            const item = document.createElement("li");
            const fila = document.createElement(permisos.editarCita ? "button" : "div");
            fila.className = "appt" + (cita.fecha < ahora ? " is-past" : "");

            if (permisos.editarCita) {
                fila.type = "button";
                fila.addEventListener("click", () => abrirCita({ cita }));
            }

            const fecha = document.createElement("span");
            fecha.className = "appt__date";
            const dia = document.createElement("strong");
            dia.textContent = cita.fecha.getDate();
            const mes = document.createElement("small");
            mes.textContent = cita.fecha.toLocaleDateString("es-MX", { month: "short" }).replace(".", "");
            fecha.append(dia, mes);

            const detalle = [horaTexto(cita.fecha)];
            if (rol === "admin" && cita.doctorName) detalle.push(`Dr(a). ${cita.doctorName}`);
            if (cita.reason) detalle.push(cita.reason);

            const info = document.createElement("span");
            info.className = "appt__info";
            const titulo = document.createElement("strong");
            titulo.textContent = nombreEnCita(cita);
            const subtitulo = document.createElement("small");
            subtitulo.textContent = detalle.join(" - ");
            info.append(titulo, subtitulo);

            fila.append(fecha, info);
            item.appendChild(fila);
            lista.appendChild(item);
        });
    }

    function pintarResumen() {
        const ahora = new Date();
        const pendientes = estado.citas.filter((c) => c.fecha >= ahora).sort((a, b) => a.fecha - b.fecha);

        fijarTexto("stat-month", estado.citas.length);
        fijarTexto("stat-upcoming", pendientes.length);

        const proxima = pendientes[0];
        fijarTexto("stat-next", proxima
            ? `${proxima.fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "")}, ${horaTexto(proxima.fecha)}`
            : "Sin citas");
    }

    async function cargarTotales() {
        if (rol !== "admin") return;

        const [pacientes, doctores] = await Promise.all([
            api("/patient?PageNumber=1&PageSize=1"),
            api("/doctor?PageNumber=1&PageSize=1")
        ]);

        if (pacientes.result === 1) fijarTexto("stat-patients", pacientes.count);
        if (doctores.result === 1) fijarTexto("stat-doctors", doctores.count);
    }

    function cambiarMes(delta) {
        estado.mes = new Date(estado.mes.getFullYear(), estado.mes.getMonth() + delta, 1);
        cargarAgenda();
    }

    // ==========================================
    // CITAS: FORMULARIO
    // ==========================================
    function llenarSelect(select, respuesta, etiqueta, placeholder) {
        select.replaceChildren(new Option(placeholder, ""));
        (respuesta.data || []).forEach((item) => select.add(new Option(etiqueta(item), String(item.id))));
    }

    async function abrirCita({ cita = null, fecha = null } = {}) {
        const editando = cita !== null;
        if (editando ? !permisos.editarCita : !permisos.crearCita) return;

        const dialogo = $("dlg-appointment");
        const form = $("form-appointment");
        const campos = form.elements;

        estado.citaEditando = cita;
        form.reset();
        fijarTexto("dlg-appointment-title", editando ? "Editar cita" : "Nueva cita");
        $("btn-appointment-delete").hidden = !(editando && permisos.eliminarCita);

        const [pacientes, doctores] = await Promise.all([
            api("/patient?PageNumber=1&PageSize=100"),
            api("/doctor?PageNumber=1&PageSize=100")
        ]);

        if (pacientes.result !== 1 || doctores.result !== 1) {
            aviso("No se pudieron cargar los pacientes y doctores. Intenta de nuevo.", "error");
            return;
        }

        llenarSelect(campos.idPatient, pacientes, (p) => `${p.firstName} ${p.lastName}`, "Selecciona un paciente");
        llenarSelect(campos.idDoctor, doctores, (d) => `Dr(a). ${d.firstName} ${d.lastName}`, "Selecciona un doctor");

        // Un doctor agenda siempre a su nombre
        if (rol === "doctor") {
            const yo = (doctores.data || []).find((d) => Number(d.idUser) === Number(usuario.id));
            if (!yo) {
                aviso("No se encontró tu registro de doctor. Contacta al administrador.", "error");
                return;
            }
            campos.idDoctor.value = String(yo.id);
        }

        // El API no permite cambiar paciente ni doctor de una cita existente
        campos.idPatient.disabled = editando;
        campos.idDoctor.disabled = editando || rol === "doctor";

        let base;
        if (editando) {
            campos.idPatient.value = String(cita.idPatient);
            campos.idDoctor.value = String(cita.idDoctor);
            base = cita.fecha;
        } else if (fecha && claveDia(fecha) !== claveDia(new Date())) {
            base = new Date(fecha);
            base.setHours(9, 0, 0, 0);
        } else {
            base = siguienteHora();
        }

        campos.date.value = claveDia(base);
        campos.time.value = horaTexto(base);
        campos.reason.value = editando ? (cita.reason || "") : "";

        if (editando) campos.date.removeAttribute("min");
        else campos.date.min = claveDia(new Date());

        dialogo.showModal();
    }

    // ==========================================
    // PACIENTES Y DOCTORES: LISTAS
    // ==========================================
    function crearCelda(texto, clase) {
        const td = document.createElement("td");
        if (clase) td.className = clase;
        td.textContent = texto;
        return td;
    }

    function crearCeldaNombre(nombre, detalle) {
        const td = document.createElement("td");
        td.className = "cell-name";
        const fuerte = document.createElement("strong");
        fuerte.textContent = nombre;
        const chico = document.createElement("small");
        chico.textContent = detalle;
        td.append(fuerte, chico);
        return td;
    }

    function crearCeldaAcciones(alEditar, alEliminar) {
        const td = document.createElement("td");
        td.className = "col-actions";

        const editar = document.createElement("button");
        editar.type = "button";
        editar.className = "app-btn app-btn--secondary app-btn--sm";
        editar.textContent = "Editar";
        editar.addEventListener("click", alEditar);

        const borrar = document.createElement("button");
        borrar.type = "button";
        borrar.className = "app-btn app-btn--danger-text app-btn--sm";
        borrar.textContent = "Eliminar";
        borrar.addEventListener("click", alEliminar);

        td.append(editar, borrar);
        return td;
    }

    function filaMensaje(tbody, columnas, texto) {
        const tr = document.createElement("tr");
        const td = crearCelda(texto, "table-empty");
        td.colSpan = columnas;
        tr.appendChild(td);
        tbody.appendChild(tr);
    }

    function pintarPaginador(prefijo, lista) {
        const desde = lista.total === 0 ? 0 : (lista.pagina - 1) * lista.tam + 1;
        const hasta = Math.min(lista.pagina * lista.tam, lista.total);

        fijarTexto(`${prefijo}-range`, lista.total === 0 ? "Sin resultados" : `Mostrando ${desde} a ${hasta} de ${lista.total}`);
        $(`${prefijo}-prev`).disabled = lista.pagina <= 1;
        $(`${prefijo}-next`).disabled = hasta >= lista.total;
    }

    async function cargarLista(config) {
        const { ruta, lista, selectorTabla, prefijo, columnas, textoVacio, crearFila } = config;
        const tbody = document.querySelector(`${selectorTabla} tbody`);
        const filtro = lista.busqueda ? `&Search=${encodeURIComponent(lista.busqueda)}` : "";

        const respuesta = await api(`${ruta}?PageNumber=${lista.pagina}&PageSize=${lista.tam}${filtro}`);
        tbody.replaceChildren();

        if (respuesta.result !== 1) {
            aviso(mensajeDeError(respuesta, "No se pudo cargar la lista."), "error");
            filaMensaje(tbody, columnas, "No fue posible cargar la información.");
            return;
        }

        lista.total = respuesta.count;

        // Si se borró el último registro de una página, regresa a la anterior
        if (respuesta.data.length === 0 && lista.pagina > 1) {
            lista.pagina -= 1;
            return cargarLista(config);
        }

        if (respuesta.data.length === 0) {
            filaMensaje(tbody, columnas, lista.busqueda ? "Ningún resultado coincide con la búsqueda." : textoVacio);
        }

        respuesta.data.forEach((item) => tbody.appendChild(crearFila(item)));
        pintarPaginador(prefijo, lista);
    }

    // ---------- Pacientes ----------
    function cargarPacientes() {
        return cargarLista({
            ruta: "/patient",
            lista: estado.pacientes,
            selectorTabla: "#patient-table",
            prefijo: "patient",
            columnas: 4,
            textoVacio: "Aún no hay pacientes registrados.",
            crearFila: (p) => {
                const tr = document.createElement("tr");
                tr.append(
                    crearCeldaNombre(`${p.firstName} ${p.lastName}`, `ID ${p.id}`),
                    crearCelda(p.phone || "No registrado"),
                    crearCelda(p.birthDate ? fechaCorta(p.birthDate) : "No registrada"),
                    crearCeldaAcciones(() => abrirPaciente(p), () => borrarPaciente(p))
                );
                return tr;
            }
        });
    }

    function configurarCamposDeAlta(form, editando) {
        form.querySelectorAll("[data-create-only]").forEach((bloque) => {
            bloque.hidden = editando;
            bloque.querySelectorAll("input").forEach((input) => { input.disabled = editando; });
        });
    }

    function abrirPaciente(paciente = null) {
        const form = $("form-patient");
        const campos = form.elements;
        const editando = paciente !== null;

        estado.pacientes.editando = paciente;
        form.reset();
        fijarTexto("dlg-patient-title", editando ? "Editar paciente" : "Nuevo paciente");
        configurarCamposDeAlta(form, editando);
        campos.birthDate.max = claveDia(new Date());

        if (editando) {
            campos.firstName.value = paciente.firstName;
            campos.lastName.value = paciente.lastName;
            campos.phone.value = paciente.phone || "";
            campos.birthDate.value = paciente.birthDate ? paciente.birthDate.substring(0, 10) : "";
        }

        $("dlg-patient").showModal();
    }

    function borrarPaciente(paciente) {
        return eliminar({
            ruta: `/patient/${paciente.id}`,
            titulo: "Eliminar paciente",
            mensaje: `Se eliminará a ${paciente.firstName} ${paciente.lastName} y se desactivará su usuario de acceso.`,
            mensajeOk: "El paciente se eliminó correctamente.",
            despues: () => { cargarPacientes(); cargarTotales(); }
        });
    }

    // ---------- Doctores ----------
    function cargarDoctores() {
        return cargarLista({
            ruta: "/doctor",
            lista: estado.doctores,
            selectorTabla: "#doctor-table",
            prefijo: "doctor",
            columnas: 3,
            textoVacio: "Aún no hay doctores registrados.",
            crearFila: (d) => {
                const tr = document.createElement("tr");
                tr.append(
                    crearCeldaNombre(`${d.firstName} ${d.lastName}`, `ID ${d.id}`),
                    crearCelda(d.licenseNumber),
                    crearCeldaAcciones(() => abrirDoctor(d), () => borrarDoctor(d))
                );
                return tr;
            }
        });
    }

    function abrirDoctor(doctor = null) {
        const form = $("form-doctor");
        const campos = form.elements;
        const editando = doctor !== null;

        estado.doctores.editando = doctor;
        form.reset();
        fijarTexto("dlg-doctor-title", editando ? "Editar doctor" : "Nuevo doctor");
        configurarCamposDeAlta(form, editando);

        if (editando) {
            campos.firstName.value = doctor.firstName;
            campos.lastName.value = doctor.lastName;
            campos.licenseNumber.value = doctor.licenseNumber;
        }

        $("dlg-doctor").showModal();
    }

    function borrarDoctor(doctor) {
        return eliminar({
            ruta: `/doctor/${doctor.id}`,
            titulo: "Eliminar doctor",
            mensaje: `Se eliminará a ${doctor.firstName} ${doctor.lastName} y se desactivará su usuario de acceso.`,
            mensajeOk: "El doctor se eliminó correctamente.",
            despues: () => { cargarDoctores(); cargarTotales(); }
        });
    }

    function conectarLista(prefijo, lista, cargar) {
        const buscador = $(`${prefijo}-search`);
        if (!buscador) return; // este rol no tiene la vista

        $(`${prefijo}-prev`).addEventListener("click", () => { lista.pagina -= 1; cargar(); });
        $(`${prefijo}-next`).addEventListener("click", () => { lista.pagina += 1; cargar(); });

        let temporizador;
        buscador.addEventListener("input", (e) => {
            clearTimeout(temporizador);
            temporizador = setTimeout(() => {
                lista.busqueda = e.target.value.trim();
                lista.pagina = 1;
                cargar();
            }, 350);
        });
    }

    // ==========================================
    // FORMULARIOS
    // ==========================================
    function conectarFormularios() {
        // --- Cita ---
        $("form-appointment").addEventListener("submit", (e) => {
            e.preventDefault();
            const form = e.target;
            const campos = form.elements;
            const editando = estado.citaEditando !== null;

            const local = new Date(`${campos.date.value}T${campos.time.value}`);
            if (Number.isNaN(local.getTime())) {
                aviso("Indica una fecha y una hora válidas.", "error");
                return;
            }

            const fechaUtc = local.toISOString(); // el formulario usa hora local; el API espera UTC
            const reason = campos.reason.value.trim() || null;

            const cuerpo = editando
                ? { appointmentDate: fechaUtc, reason }
                : {
                    idPatient: Number(campos.idPatient.value),
                    idDoctor: Number(campos.idDoctor.value),
                    appointmentDate: fechaUtc,
                    reason
                };

            guardar({
                boton: e.submitter || form.querySelector('[type="submit"]'),
                ruta: editando ? `/appointment/${estado.citaEditando.id}` : "/appointment",
                metodo: editando ? "PUT" : "POST",
                cuerpo,
                dialogo: $("dlg-appointment"),
                mensajeOk: editando ? "La cita se actualizó correctamente." : "La cita se agendó correctamente.",
                despues: cargarAgenda
            });
        });

        $("btn-appointment-delete").addEventListener("click", async () => {
            const eliminada = await eliminar({
                ruta: `/appointment/${estado.citaEditando.id}`,
                titulo: "Eliminar cita",
                mensaje: "La cita se quitará de la agenda. Esta acción no se puede deshacer.",
                mensajeOk: "La cita se eliminó correctamente.",
                despues: cargarAgenda
            });
            if (eliminada) $("dlg-appointment").close();
        });

        // --- Paciente ---
        $("form-patient").addEventListener("submit", (e) => {
            e.preventDefault();
            const form = e.target;
            const campos = form.elements;
            const editando = estado.pacientes.editando !== null;

            const cuerpo = {
                firstName: campos.firstName.value.trim(),
                lastName: campos.lastName.value.trim(),
                phone: campos.phone.value.trim() || null,
                birthDate: campos.birthDate.value || null
            };
            if (!editando) {
                cuerpo.email = campos.email.value.trim();
                cuerpo.password = campos.password.value;
            }

            guardar({
                boton: e.submitter || form.querySelector('[type="submit"]'),
                ruta: editando ? `/patient/${estado.pacientes.editando.id}` : "/patient",
                metodo: editando ? "PUT" : "POST",
                cuerpo,
                dialogo: $("dlg-patient"),
                mensajeOk: editando ? "El paciente se actualizó correctamente." : "El paciente se registró correctamente.",
                despues: () => { cargarPacientes(); cargarTotales(); }
            });
        });

        // --- Doctor ---
        $("form-doctor").addEventListener("submit", (e) => {
            e.preventDefault();
            const form = e.target;
            const campos = form.elements;
            const editando = estado.doctores.editando !== null;

            const cuerpo = {
                firstName: campos.firstName.value.trim(),
                lastName: campos.lastName.value.trim(),
                licenseNumber: campos.licenseNumber.value.trim()
            };
            if (!editando) {
                cuerpo.email = campos.email.value.trim();
                cuerpo.password = campos.password.value;
            }

            guardar({
                boton: e.submitter || form.querySelector('[type="submit"]'),
                ruta: editando ? `/doctor/${estado.doctores.editando.id}` : "/doctor",
                metodo: editando ? "PUT" : "POST",
                cuerpo,
                dialogo: $("dlg-doctor"),
                mensajeOk: editando ? "El doctor se actualizó correctamente." : "El doctor se registró correctamente.",
                despues: () => { cargarDoctores(); cargarTotales(); }
            });
        });
    }

    // ==========================================
    // NAVEGACIÓN Y ARRANQUE
    // ==========================================
    function mostrarVista(nombre) {
        if (!permisos.vistas.includes(nombre)) return;
        estado.vista = nombre;

        document.querySelectorAll(".app-view").forEach((vista) => {
            vista.hidden = vista.id !== `view-${nombre}`;
        });

        document.querySelectorAll(".app-nav__item").forEach((boton) => {
            const activo = boton.dataset.view === nombre;
            boton.classList.toggle("is-active", activo);
            if (activo) boton.setAttribute("aria-current", "page");
            else boton.removeAttribute("aria-current");
        });

        const config = VISTAS[nombre];
        fijarTexto("view-title", config.titulo);
        fijarTexto("view-subtitle", nombre === "agenda" ? subtituloAgenda() : config.subtitulo);
        fijarTexto("btn-primary-label", config.accion);
        $("btn-primary-action").hidden = nombre === "agenda" && !permisos.crearCita;

        window.history.replaceState(null, "", `#${nombre}`);

        if (nombre === "pacientes") cargarPacientes();
        if (nombre === "doctores") cargarDoctores();
    }

    function iniciarShell() {
        const nombre = usuario.fullName || usuario.email || "Usuario";
        fijarTexto("user-name", nombre);
        fijarTexto("user-role", NOMBRE_DE_ROL[rol]);
        fijarTexto("user-initials", iniciales(nombre));

        $("btn-logout").addEventListener("click", async () => {
            // Reutilizamos tu modal elegante de confirmación
            const confirmado = await confirmar({
                titulo: "Cerrar sesión",
                mensaje: "¿Estás seguro de que deseas salir del sistema?",
                aceptar: "Sí, salir"
            });

            // Si el usuario da clic en "Sí, salir", procedemos
            if (confirmado) {
                localStorage.removeItem("user");
                window.location.href = LOGIN_PAGE;
            }
        });

        // Quita del documento todo lo que este rol no puede usar
        document.querySelectorAll(".app-nav__item").forEach((boton) => {
            if (!permisos.vistas.includes(boton.dataset.view)) boton.remove();
        });
        document.querySelectorAll(".app-view").forEach((vista) => {
            if (!permisos.vistas.includes(vista.id.replace("view-", ""))) vista.remove();
        });
        document.querySelectorAll("[data-roles]").forEach((elemento) => {
            if (!elemento.dataset.roles.split(" ").includes(rol)) elemento.remove();
        });

        document.querySelectorAll(".app-nav__item").forEach((boton) =>
            boton.addEventListener("click", () => mostrarVista(boton.dataset.view)));
    }

    function conectarEventos() {
        $("btn-primary-action").addEventListener("click", () => {
            if (estado.vista === "agenda") abrirCita();
            else if (estado.vista === "pacientes") abrirPaciente();
            else abrirDoctor();
        });

        $("btn-prev-month").addEventListener("click", () => cambiarMes(-1));
        $("btn-next-month").addEventListener("click", () => cambiarMes(1));
        $("btn-today").addEventListener("click", () => {
            const hoy = new Date();
            estado.mes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            cargarAgenda();
        });

        conectarLista("patient", estado.pacientes, cargarPacientes);
        conectarLista("doctor", estado.doctores, cargarDoctores);
        conectarFormularios();
    }

    function iniciar() {
        iniciarShell();
        activarDialogos();
        conectarEventos();

        const pedida = window.location.hash.replace("#", "");
        mostrarVista(permisos.vistas.includes(pedida) ? pedida : "agenda");

        cargarAgenda();
        cargarTotales();
    }

    iniciar();
})();