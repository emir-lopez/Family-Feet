import { readdir, readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import { minify as minifyHtml } from "html-minifier-terser";
import { transform } from "lightningcss";
import { minify as minifyJs } from "terser";

const SRC = "FamilyFeet.Web/wwwroot";
const OUT = "dist";

// Limpia la carpeta de salida
await rm(OUT, { recursive: true, force: true });
await mkdir(`${OUT}/css`, { recursive: true });
await mkdir(`${OUT}/js`, { recursive: true });

// HTML
const pages = (await readdir(SRC)).filter((file) => file.endsWith(".html"));
for (const file of pages) {
  const source = await readFile(`${SRC}/${file}`, "utf8");
  const output = await minifyHtml(source, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    minifyJS: true,
  });
  await writeFile(`${OUT}/${file}`, output);
}

// CSS
const css = await readFile(`${SRC}/css/styles.css`);
const { code } = transform({ filename: "styles.css", code: css, minify: true });
await writeFile(`${OUT}/css/styles.css`, code);

// JavaScript (minificado y con nombres abreviados)
const js = await readFile(`${SRC}/js/main.js`, "utf8");
const result = await minifyJs(js, { compress: true, mangle: true, format: { comments: false } });
await writeFile(`${OUT}/js/main.js`, result.code);

// Imágenes
await cp(`${SRC}/assets`, `${OUT}/assets`, { recursive: true });
await writeFile(`${OUT}/.nojekyll`, "");

console.log(`Build listo: ${pages.length} páginas en ${OUT}/`);
