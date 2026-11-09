(() => {
    "use strict";

    const WHATSAPP_NUMBER = "524881930989";
    // Puerto actualizado al 7210
    const API_BASE_URL = "https://localhost:7210/api";

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

                    toggle.addEventListener("click", () => {
                        setOpen(toggle.getAttribute("aria-expanded") !== "true");
                    });

                    nav.addEventListener("click", (event) => {
                        if (event.target.closest("a")) setOpen(false);
                    });

                    document.addEventListener("keydown", (event) => {
                        if (event.key === "Escape") setOpen(false);
                    });
                }

                const onScroll = () => {
                    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
                };
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

                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    // Mensaje amigable de error de credenciales
                    showToast('El correo o la contraseña no coinciden. Por favor, verifica tus datos.', 'error');
                }
            } catch (error) {
                console.error('Error de conexión:', error);
                // Mensaje amigable de error de red
                showToast('Parece que hay un problema de conexión. Por favor, intenta de nuevo en unos minutos.', 'error');
            }
        });
    }

    // ==========================================
    // SISTEMA: CRUD EN DASHBOARD
    // ==========================================

    async function borrarPaciente(id) {
        if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
            try {
                const peticion = await fetch(`${API_BASE_URL}/patient/${id}`, { method: 'DELETE' });
                const respuesta = await peticion.json();

                if (respuesta.result === 1) {
                    showToast('El registro se ha eliminado correctamente.', 'success');
                    cargarPacientes();
                } else {
                    showToast('No se pudo eliminar el registro en este momento. Intenta de nuevo.', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Parece que hay un problema de conexión. Por favor, intenta más tarde.', 'error');
            }
        }
    }

    function editarPaciente(id) {
        showToast("Preparando la información del paciente para editarla...", 'info');
    }

    async function cargarPacientes() {
        const tbody = document.querySelector('.data-table tbody');
        const template = document.getElementById('patient-row-template');

        if (!tbody || !template) return;

        try {
            const peticion = await fetch(`${API_BASE_URL}/patient?PageNumber=1&PageSize=50`);
            const respuesta = await peticion.json();

            if (respuesta.result === 1) {
                tbody.innerHTML = '';

                respuesta.data.forEach(paciente => {
                    const clone = template.content.cloneNode(true);
                    const birth = paciente.birthDate ? paciente.birthDate.substring(0, 10) : 'N/A';

                    clone.querySelector('.col-id').textContent = `#${paciente.id}`;
                    clone.querySelector('.col-name strong').textContent = `${paciente.firstName} ${paciente.lastName}`;
                    clone.querySelector('.col-phone').textContent = paciente.phone || 'N/A';
                    clone.querySelector('.col-date').textContent = birth;

                    const btnEdit = clone.querySelector('.btn-edit');
                    const btnDelete = clone.querySelector('.btn-delete');

                    btnEdit.addEventListener('click', () => editarPaciente(paciente.id));
                    btnDelete.addEventListener('click', () => borrarPaciente(paciente.id));

                    tbody.appendChild(clone);
                });
            }
        } catch (error) {
            console.error('Error al cargar pacientes:', error);
            showToast('Tuvimos un problema al cargar la lista de pacientes. Por favor, recarga la página.', 'error');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        cargarPacientes();
    });

})();