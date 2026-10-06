# Family Feet Podólogos

Sitio web informativo, responsivo, semántico y accesible para un centro de podología.
Actividad 2 del Laboratorio de Programación Web (FIME - UANL).

- **Sitio publicado:** https://emir-lopez.github.io/Family-Feet/
- **Repositorio:** https://github.com/emir-lopez/Family-Feet

## Objetivo

Construir y publicar un sitio web responsivo con HTML5 semántico y CSS moderno, aplicando
principios de usabilidad, accesibilidad y validación de estándares.

## Vistas

| Vista | Archivo |
|---|---|
| Inicio (quiénes somos, servicios, ubicación) | `index.html` |
| Servicios y productos | `services.html` |
| Contacto | `contact.html` |
| Nosotros | `about.html` |
| Cuidado del pie (preguntas frecuentes y consejos) | `faq.html` |

## Tecnologías

- HTML5 semántico: `header`, `nav`, `main`, `section`, `article`, `footer`, `details`
- CSS3 moderno: variables, Flexbox, Grid, `clamp()`, transiciones y animaciones, media queries
- JavaScript nativo (sin librerías): menú móvil, animación al hacer scroll y formulario hacia WhatsApp
- Solución de Visual Studio 2022 (ASP.NET Core vacío) solo para servir los archivos estáticos en local
- Node.js solo para compilar: `html-minifier-terser`, `lightningcss` y `terser`
- GitHub Actions + GitHub Pages para el despliegue

## Estructura

```
FamilyFeet.sln
FamilyFeet.Web/
  Program.cs                  # servidor estático para desarrollo
  wwwroot/                    # el sitio web
    index.html, services.html, about.html, faq.html, contact.html
    css/styles.css
    js/main.js
    assets/img/
build.mjs                     # minifica wwwroot hacia dist/
.github/workflows/deploy.yml  # compila y publica en GitHub Pages
```

## Uso local

1. Abrir `FamilyFeet.sln` en Visual Studio 2022.
2. Presionar la flecha verde (perfil `http`).

Para generar la versión minificada que se publica:

```
npm install
npm run build
```

El resultado queda en `dist/`.

## Responsividad

Diseño fluido con Grid y Flexbox. Breakpoints en 900 px (tablet: menú hamburguesa y columnas
apiladas) y 600 px (móvil: formulario y botones a una columna).

## Accesibilidad

- Enlace "Saltar al contenido" y un solo `h1` por página con jerarquía ordenada
- Textos alternativos en imágenes; iconos decorativos ocultos con `aria-hidden`
- `label` asociado a cada campo del formulario
- Navegación con teclado, foco visible y `aria-current` en la página activa
- Contraste de color superior a 4.5:1 en texto
- Respeto a `prefers-reduced-motion`

## Validación

| Herramienta | Resultado |
|---|---|
| W3C Nu HTML Checker (5 páginas) | 0 errores, 0 advertencias |
| W3C CSS Validator (CSS nivel 3 + SVG) | 0 errores; advertencias por prefijos de navegador y variables CSS |

Capturas de la validación en línea: `screenshots/`.

## Capturas

- `screenshots/home-desktop.png`
- `screenshots/home-mobile.png`
- `screenshots/services-desktop.png`
- `screenshots/contact-mobile.png`
- `screenshots/validation-html.png`
- `screenshots/validation-css.png`

## Autor

Emir Misael López Pérez - Matrícula 2150561 - Clase Jueves V4
Docente: Laura Patricia del Bosque Vega
