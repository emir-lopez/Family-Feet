(() => {
  "use strict";

  const WHATSAPP_NUMBER = "524881930989";
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#primary-nav");

  // Menú móvil
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

  // Sombra del header al bajar
  const onScroll = () => {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Aparición de elementos al hacer scroll
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

  // Formulario: abre WhatsApp con el mensaje (sin servidor)
  const form = document.querySelector("#contact-form");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const lines = ["Hola, me gustaría solicitar información."];

      if (data.get("name")) lines.push(`Nombre: ${data.get("name")}`);
      if (data.get("phone")) lines.push(`Teléfono: ${data.get("phone")}`);
      if (data.get("service")) lines.push(`Servicio de interés: ${data.get("service")}`);
      if (data.get("message")) lines.push(`Mensaje: ${data.get("message")}`);

      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
      window.open(url, "_blank", "noopener");
    });
  }
})();
