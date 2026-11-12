(() => {
    "use strict";

    // ==========================================
    // CONTRASEÑA: mostrar/ocultar y aviso de mayúsculas
    // ==========================================
    const pw = document.getElementById("password");
    const toggle = document.getElementById("pw-toggle");
    const caps = document.getElementById("caps-hint");

    if (pw && toggle) {
        toggle.addEventListener("click", () => {
            const show = pw.type === "password";
            pw.type = show ? "text" : "password";
            toggle.textContent = show ? "Ocultar" : "Mostrar";
            toggle.setAttribute("aria-pressed", String(show));
        });
    }

    if (pw && caps) {
        const check = (e) => {
            if (e.getModifierState) caps.hidden = !e.getModifierState("CapsLock");
        };
        pw.addEventListener("keydown", check);
        pw.addEventListener("keyup", check);
        pw.addEventListener("blur", () => { caps.hidden = true; });
    }

    // ==========================================
    // FONDO: huellas que caminan despacio
    // Pocas, lentas y tenues: se leen como textura, no como espectáculo.
    // ==========================================
    const canvas = document.getElementById("auth-fx");
    if (!canvas || !canvas.getContext) return;

    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const STRIDE = 52;      // distancia entre pasos (px)
    const SPEED = 20;       // velocidad de avance (px/s)
    const LIFE = 7000;      // vida de cada huella (ms)
    const MAX_ALPHA = 0.2;  // opacidad máxima
    const SCALE = 1.35;     // tamaño de la huella
    const GAIT = 9;         // separación lateral entre pie izquierdo y derecho
    const INK = "95, 211, 198";

    let w = 0, h = 0, dpr = 1;
    let walkers = [], prints = [];
    let raf = 0, last = 0;

    const rand = (a, b) => a + Math.random() * (b - a);

    function makeWalker(initial) {
        // Todos avanzan hacia arriba, inclinados a un lado u otro.
        const toRight = Math.random() < 0.5;
        const ang = toRight ? rand(-1.35, -0.8) : rand(-2.35, -1.8);
        const c = Math.cos(ang), s = Math.sin(ang);
        let x = toRight ? rand(-0.05 * w, 0.75 * w) : rand(0.25 * w, 1.05 * w);
        let y = h + 40;
        if (initial) {
            const advance = rand(0, h * 0.9);
            x += c * advance;
            y += s * advance;
        }
        return { x, y, c, s, ang, dist: STRIDE * Math.random(), left: Math.random() < 0.5 };
    }

    function setup() {
        const count = Math.max(2, Math.min(4, Math.round(w / 420)));
        walkers = Array.from({ length: count }, () => makeWalker(true));
        prints = [];
    }

    function addPrint(wk, born, alpha) {
        const side = wk.left ? 1 : -1;
        // Izquierda del rumbo en coordenadas de pantalla: (s, -c)
        prints.push({
            x: wk.x + wk.s * GAIT * side,
            y: wk.y - wk.c * GAIT * side,
            rot: wk.ang + Math.PI / 2,
            left: wk.left,
            born,
            fixed: alpha
        });
        wk.left = !wk.left;
    }

    // Huella de pie izquierdo (dedo gordo en +x); el derecho se espeja.
    function drawFoot(p, alpha) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(p.left ? SCALE : -SCALE, SCALE);
        ctx.fillStyle = `rgba(${INK}, ${alpha})`;
        ctx.beginPath();
        const ell = (cx, cy, rx, ry) => { ctx.moveTo(cx + rx, cy); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); };
        const dot = (cx, cy, r) => { ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, Math.PI * 2); };
        ell(0, -5, 4.4, 6.8);        // antepié
        ell(-1.6, 1.5, 1.4, 3);      // borde externo (puente del arco)
        ell(0.6, 7.2, 3.1, 4.2);     // talón
        dot(3.2, -14.2, 1.9);        // dedo gordo
        dot(0.6, -15.6, 1.4);
        dot(-1.7, -14.6, 1.2);
        dot(-3.5, -13, 1.1);
        dot(-4.8, -10.8, 0.9);
        ctx.fill();
        ctx.restore();
    }

    function frame(t) {
        const dt = Math.min((t - last) / 1000, 0.1);
        last = t;
        ctx.clearRect(0, 0, w, h);

        walkers.forEach((wk, i) => {
            wk.x += wk.c * SPEED * dt;
            wk.y += wk.s * SPEED * dt;
            wk.dist += SPEED * dt;
            if (wk.dist >= STRIDE) {
                wk.dist -= STRIDE;
                addPrint(wk, t);
            }
            if (wk.y < -60 || wk.x < -80 || wk.x > w + 80) walkers[i] = makeWalker(false);
        });

        prints = prints.filter((p) => t - p.born < LIFE);
        prints.forEach((p) => {
            const k = (t - p.born) / LIFE;
            const a = MAX_ALPHA * Math.min(k / 0.15, 1) * Math.min((1 - k) / 0.6, 1);
            drawFoot(p, a);
        });

        raf = requestAnimationFrame(frame);
    }

    // Con "reducir movimiento": una composición fija, sin animación.
    function drawStatic() {
        ctx.clearRect(0, 0, w, h);
        walkers.forEach((wk) => {
            for (let i = 0; i < 7; i++) {
                addPrint(wk, 0, 0.11);
                wk.x += wk.c * STRIDE;
                wk.y += wk.s * STRIDE;
            }
        });
        prints.forEach((p) => drawFoot(p, p.fixed));
    }

    function start() {
        cancelAnimationFrame(raf);
        if (reduceMotion) { drawStatic(); return; }
        last = performance.now();
        raf = requestAnimationFrame(frame);
    }

    function resize() {
        const r = canvas.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = r.width;
        h = r.height;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        setup();
        start();
    }

    let resizeTimer = 0;
    let lastWidth = 0;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // En móvil la barra del navegador cambia el alto; solo reinicia si cambió el ancho.
            if (Math.abs(canvas.getBoundingClientRect().width - lastWidth) > 1) {
                lastWidth = canvas.getBoundingClientRect().width;
                resize();
            }
        }, 150);
    });

    // Sin gasto de batería cuando la pestaña no está a la vista
    document.addEventListener("visibilitychange", () => {
        if (reduceMotion) return;
        if (document.hidden) cancelAnimationFrame(raf);
        else start();
    });

    lastWidth = canvas.getBoundingClientRect().width;
    resize();
})();