import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, l as renderHead } from "../chunks/astro/server_KVWy4EfK.mjs";
import "piccolore";
/* empty css                                    */
import { $ as $$InternalUIComponentRenderer } from "../chunks/InternalUIComponentRenderer_bPjsmDTl.mjs";
import { renderers } from "../renderers.mjs";
const $$Astro = createAstro();
const $$SignUp = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$SignUp;
  return renderTemplate`${renderComponent($$result, "InternalUIComponentRenderer", $$InternalUIComponentRenderer, { ...Astro2.props, "component": "sign-up" })}`;
}, "C:/Users/46/Desktop/programa/clerk-astro/node_modules/@clerk/astro/components/interactive/SignUp.astro", void 0);
var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Cadastro = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate(_a || (_a = __template(['<html lang="pt-BR" data-theme="dark" data-astro-cid-hcigcqkj> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="mobile-web-app-capable" content="yes"><meta name="theme-color" content="#1e88e5"><title>ScarTech Solutions - Criar Conta</title>', '</head> <body data-astro-cid-hcigcqkj> <!-- Theme Toggle Button --> <button class="theme-toggle" id="themeToggle" title="Alternar tema" data-astro-cid-hcigcqkj> <span class="theme-icon" data-astro-cid-hcigcqkj>🌙</span> </button> <div class="signup-container" data-astro-cid-hcigcqkj> <div class="logo-container" data-astro-cid-hcigcqkj> <img src="/logo.png" alt="ScarTech Solutions" class="logo-icon" data-astro-cid-hcigcqkj> </div> ', ' </div> <script>\n    // Theme management\n    (function() {\n      const themeToggle = document.getElementById("themeToggle");\n      const themeIcon = themeToggle?.querySelector(".theme-icon");\n      \n      function initTheme() {\n        const savedTheme = localStorage.getItem("scartech_theme");\n        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;\n        const theme = savedTheme || (prefersDark ? "dark" : "light");\n        document.documentElement.setAttribute("data-theme", theme);\n        updateThemeIcon(theme);\n      }\n      \n      function updateThemeIcon(theme) {\n        if (themeIcon) themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";\n      }\n      \n      function toggleTheme() {\n        const currentTheme = document.documentElement.getAttribute("data-theme");\n        const newTheme = currentTheme === "dark" ? "light" : "dark";\n        document.documentElement.setAttribute("data-theme", newTheme);\n        localStorage.setItem("scartech_theme", newTheme);\n        updateThemeIcon(newTheme);\n      }\n      \n      themeToggle?.addEventListener("click", toggleTheme);\n      initTheme();\n    })();\n    <\/script> </body> </html>'])), renderHead(), renderComponent($$result, "SignUp", $$SignUp, { "routing": "path", "path": "/cadastro", "signInUrl": "/", "data-astro-cid-hcigcqkj": true }));
}, "C:/Users/46/Desktop/programa/clerk-astro/src/pages/cadastro.astro", void 0);
const $$file = "C:/Users/46/Desktop/programa/clerk-astro/src/pages/cadastro.astro";
const $$url = "/cadastro";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$Cadastro,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
