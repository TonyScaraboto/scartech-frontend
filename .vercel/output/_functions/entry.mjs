import { renderers } from "./renderers.mjs";
import { c as createExports, s as serverEntrypointModule } from "./chunks/_@astrojs-ssr-adapter_y9sKSPlp.mjs";
import { manifest } from "./manifest_CaTq623Y.mjs";
const serverIslandMap = /* @__PURE__ */ new Map();
;
const _page0 = () => import("./pages/_image.astro.mjs");
const _page1 = () => import("./pages/cadastro.astro.mjs");
const _page2 = () => import("./pages/dashboard.astro.mjs");
const _page3 = () => import("./pages/faturamento.astro.mjs");
const _page4 = () => import("./pages/ordem.astro.mjs");
const _page5 = () => import("./pages/ordens.astro.mjs");
const _page6 = () => import("./pages/produtos.astro.mjs");
const _page7 = () => import("./pages/sso-callback.astro.mjs");
const _page8 = () => import("./pages/vendas.astro.mjs");
const _page9 = () => import("./pages/index.astro.mjs");
const pageMap = /* @__PURE__ */ new Map([
  ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
  ["src/pages/cadastro.astro", _page1],
  ["src/pages/dashboard.astro", _page2],
  ["src/pages/faturamento.astro", _page3],
  ["src/pages/ordem.astro", _page4],
  ["src/pages/ordens.astro", _page5],
  ["src/pages/produtos.astro", _page6],
  ["src/pages/sso-callback.astro", _page7],
  ["src/pages/vendas.astro", _page8],
  ["src/pages/index.astro", _page9]
]);
const _manifest = Object.assign(manifest, {
  pageMap,
  serverIslandMap,
  renderers,
  actions: () => import("./noop-entrypoint.mjs"),
  middleware: () => import("./_noop-middleware.mjs")
});
const _args = {
  "middlewareSecret": "184747a8-e7e3-4e85-9c1d-d9140875bf19",
  "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = "start";
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;
export {
  __astrojsSsrVirtualEntry as default,
  pageMap
};
