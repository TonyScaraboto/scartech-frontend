import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, l as renderHead } from "../chunks/astro/server_KVWy4EfK.mjs";
import "piccolore";
/* empty css                                 */
import { $ as $$SignedIn, a as $$SignedOut } from "../chunks/SignedOut_CdO1hTIx.mjs";
import { $ as $$InternalUIComponentRenderer } from "../chunks/InternalUIComponentRenderer_bPjsmDTl.mjs";
import { renderers } from "../renderers.mjs";
const $$Astro = createAstro();
const $$SignIn = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$SignIn;
  return renderTemplate`${renderComponent($$result, "InternalUIComponentRenderer", $$InternalUIComponentRenderer, { ...Astro2.props, "component": "sign-in" })}`;
}, "C:/Users/46/Desktop/programa/clerk-astro/node_modules/@clerk/astro/components/interactive/SignIn.astro", void 0);
var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate(_a || (_a = __template(['<html lang="pt-BR" data-theme="dark" data-astro-cid-j7pv25f6> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="mobile-web-app-capable" content="yes"><meta name="theme-color" content="#1e88e5"><title>ScarTech Solutions - Login</title>', '</head> <body data-astro-cid-j7pv25f6> <!-- Theme Toggle Button --> <button class="theme-toggle" id="themeToggle" title="Alternar tema" data-astro-cid-j7pv25f6> <span class="theme-icon" data-astro-cid-j7pv25f6>🌙</span> </button> <div class="login-container" data-astro-cid-j7pv25f6> <div class="logo-container" data-astro-cid-j7pv25f6> <img src="/logo.png" alt="ScarTech Solutions" class="logo-icon" data-astro-cid-j7pv25f6> </div> ', " ", ' </div> <script>\n    // Theme management\n    (function() {\n      const themeToggle = document.getElementById("themeToggle");\n      const themeIcon = themeToggle?.querySelector(".theme-icon");\n      \n      function initTheme() {\n        const savedTheme = localStorage.getItem("scartech_theme");\n        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;\n        const theme = savedTheme || (prefersDark ? "dark" : "light");\n        document.documentElement.setAttribute("data-theme", theme);\n        updateThemeIcon(theme);\n      }\n      \n      function updateThemeIcon(theme) {\n        if (themeIcon) themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";\n      }\n      \n      function toggleTheme() {\n        const currentTheme = document.documentElement.getAttribute("data-theme");\n        const newTheme = currentTheme === "dark" ? "light" : "dark";\n        document.documentElement.setAttribute("data-theme", newTheme);\n        localStorage.setItem("scartech_theme", newTheme);\n        updateThemeIcon(newTheme);\n      }\n      \n      themeToggle?.addEventListener("click", toggleTheme);\n      initTheme();\n    })();\n    <\/script> </body> </html>'])), renderHead(), renderComponent($$result, "SignedOut", $$SignedOut, { "data-astro-cid-j7pv25f6": true }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "SignIn", $$SignIn, { "routing": "path", "path": "/", "signUpUrl": "/cadastro", "data-astro-cid-j7pv25f6": true })} ` }), renderComponent($$result, "SignedIn", $$SignedIn, { "data-astro-cid-j7pv25f6": true }, { "default": ($$result2) => renderTemplate` <div class="welcome-container" data-astro-cid-j7pv25f6> <p class="welcome-text" data-astro-cid-j7pv25f6>✓ Você está conectado!</p> <a href="/dashboard" class="btn-dashboard" data-astro-cid-j7pv25f6>Acessar Dashboard</a> </div> ` }));
}, "C:/Users/46/Desktop/programa/clerk-astro/src/pages/index.astro", void 0);
const $$file = "C:/Users/46/Desktop/programa/clerk-astro/src/pages/index.astro";
const $$url = "";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
