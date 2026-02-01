import { e as createComponent, r as renderTemplate, o as defineScriptVars, g as addAttribute, m as maybeRenderHead, h as createAstro, l as renderHead, k as renderComponent } from "../chunks/astro/server_KVWy4EfK.mjs";
import "piccolore";
import "clsx";
import { g as generateSafeId } from "../chunks/index_D3GXOACt.mjs";
import { renderers } from "../renderers.mjs";
var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro = createAstro();
const $$AuthenticateWithRedirectCallback = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$AuthenticateWithRedirectCallback;
  const safeId = generateSafeId();
  const functionName = "handleRedirectCallback";
  return renderTemplate(_a || (_a = __template(["", "<div", "></div> <script>(function(){", "\n  /**\n   * Store the id and the props for the Astro component in order to invoice the correct Clerk function once clerk is loaded.\n   * The above is handled by `invokeClerkAstroJSFunctions`.\n   *\n   * TODO: This should be moved to a separate file once we implement more control components.\n   */\n  const setOrCreatePropMap = ({ functionName, id, props }) => {\n    if (!window.__astro_clerk_function_props) {\n      window.__astro_clerk_function_props = new Map();\n    }\n\n    if (!window.__astro_clerk_function_props.has(functionName)) {\n      const _ = new Map();\n      _.set(id, props);\n      window.__astro_clerk_function_props.set(functionName, _);\n    }\n\n    window.__astro_clerk_function_props.get(functionName)?.set(id, props);\n  };\n\n  setOrCreatePropMap({\n    functionName,\n    id: safeId,\n    props,\n  });\n})();<\/script>"], ["", "<div", "></div> <script>(function(){", "\n  /**\n   * Store the id and the props for the Astro component in order to invoice the correct Clerk function once clerk is loaded.\n   * The above is handled by \\`invokeClerkAstroJSFunctions\\`.\n   *\n   * TODO: This should be moved to a separate file once we implement more control components.\n   */\n  const setOrCreatePropMap = ({ functionName, id, props }) => {\n    if (!window.__astro_clerk_function_props) {\n      window.__astro_clerk_function_props = new Map();\n    }\n\n    if (!window.__astro_clerk_function_props.has(functionName)) {\n      const _ = new Map();\n      _.set(id, props);\n      window.__astro_clerk_function_props.set(functionName, _);\n    }\n\n    window.__astro_clerk_function_props.get(functionName)?.set(id, props);\n  };\n\n  setOrCreatePropMap({\n    functionName,\n    id: safeId,\n    props,\n  });\n})();<\/script>"])), maybeRenderHead(), addAttribute(`clerk-${functionName}-${safeId}`, "data-clerk-function-id"), defineScriptVars({ props: Astro2.props, functionName, safeId }));
}, "C:/Users/46/Desktop/programa/clerk-astro/node_modules/@clerk/astro/components/control/AuthenticateWithRedirectCallback.astro", void 0);
const $$SsoCallback = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html lang="pt-BR"> <head><title>Autenticando...</title><meta charset="utf-8">${renderHead()}</head> <body> ${renderComponent($$result, "AuthenticateWithRedirectCallback", $$AuthenticateWithRedirectCallback, {})} </body></html>`;
}, "C:/Users/46/Desktop/programa/clerk-astro/src/pages/sso-callback.astro", void 0);
const $$file = "C:/Users/46/Desktop/programa/clerk-astro/src/pages/sso-callback.astro";
const $$url = "/sso-callback";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$SsoCallback,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
