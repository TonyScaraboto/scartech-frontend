import "piccolore";
import { q as decodeKey } from "./chunks/astro/server_KVWy4EfK.mjs";
import "clsx";
import { N as NOOP_MIDDLEWARE_FN } from "./chunks/astro-designed-error-pages_CnUKArUE.mjs";
import "es-module-lexer";
function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}
function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}
function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}
const manifest = deserializeManifest({"hrefRoot":"file:///C:/Users/46/Desktop/programa/clerk-astro/","cacheDir":"file:///C:/Users/46/Desktop/programa/clerk-astro/node_modules/.astro/","outDir":"file:///C:/Users/46/Desktop/programa/clerk-astro/dist/","srcDir":"file:///C:/Users/46/Desktop/programa/clerk-astro/src/","publicDir":"file:///C:/Users/46/Desktop/programa/clerk-astro/public/","buildClientDir":"file:///C:/Users/46/Desktop/programa/clerk-astro/dist/client/","buildServerDir":"file:///C:/Users/46/Desktop/programa/clerk-astro/dist/server/","adapterName":"@astrojs/vercel","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.YRIxFgA-.js"}],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.YRIxFgA-.js"}],"styles":[{"type":"inline","content":":root{--bg-primary: #0a0a0f;--bg-secondary: #12121a;--bg-card: linear-gradient(145deg, #12121a 0%, #1a1a2e 100%);--text-primary: #ffffff;--text-secondary: #e0e0e0;--text-muted: #6b7280;--border-color: rgba(0, 255, 255, .1);--accent-color: #00ffff;--accent-secondary: #00ff88;--shadow-color: rgba(0, 212, 255, .2)}[data-astro-cid-hcigcqkj][data-theme=light]{--bg-primary: #f5f5f5;--bg-secondary: #ffffff;--bg-card: linear-gradient(145deg, #ffffff 0%, #f0f0f0 100%);--text-primary: #1a1a2e;--text-secondary: #4a4a5a;--text-muted: #6b7280;--border-color: rgba(0, 150, 200, .2);--accent-color: #0088aa;--accent-secondary: #00aa66;--shadow-color: rgba(0, 0, 0, .1)}.theme-toggle[data-astro-cid-hcigcqkj]{position:fixed;top:15px;right:15px;width:45px;height:45px;border-radius:50%;background:var(--bg-secondary);border:1px solid var(--border-color);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:1001;transition:all .3s ease;box-shadow:0 2px 10px var(--shadow-color)}.theme-toggle[data-astro-cid-hcigcqkj]:hover{transform:scale(1.1);box-shadow:0 4px 20px var(--shadow-color)}.theme-icon[data-astro-cid-hcigcqkj]{font-size:1.3rem;line-height:1}[data-astro-cid-hcigcqkj]{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:var(--bg-primary);color:var(--text-secondary);transition:background .3s ease,color .3s ease;min-height:100vh;min-height:-webkit-fill-available;display:flex;align-items:center;justify-content:center;padding:20px;padding-top:env(safe-area-inset-top,20px);padding-bottom:env(safe-area-inset-bottom,20px)}html{height:-webkit-fill-available}.signup-container[data-astro-cid-hcigcqkj]{text-align:center;padding:1.5rem;width:100%;max-width:480px}.logo-container[data-astro-cid-hcigcqkj]{margin-bottom:.5rem}.logo-icon[data-astro-cid-hcigcqkj]{width:150px;height:auto;margin-bottom:1rem;object-fit:contain}.cl-rootBox{width:100%}.cl-card{background:var(--bg-card)!important;border:1px solid var(--border-color)!important;border-radius:16px!important;box-shadow:0 4px 20px var(--shadow-color)!important;padding:1.5rem!important;min-width:auto!important;width:100%!important;max-width:400px!important}.cl-headerTitle,.cl-headerSubtitle{display:none!important}.cl-formFieldLabel{color:#333!important;font-weight:500!important}.cl-formFieldInput{background:#f8f9fa!important;border:1px solid #e0e0e0!important;border-radius:10px!important;color:#333!important;padding:1rem 1.25rem!important}.cl-formFieldInput:focus{border-color:#1e88e5!important;box-shadow:0 0 0 3px #1e88e526!important}.cl-formButtonPrimary{background:linear-gradient(135deg,#1e88e5,#1565c0)!important;border:none!important;border-radius:10px!important;padding:1rem!important;font-weight:600!important}.cl-formButtonPrimary:hover{background:linear-gradient(135deg,#42a5f5,#1e88e5)!important}.cl-footerActionLink{color:#1e88e5!important}.cl-footerActionText{color:#666!important}.cl-socialButtons,.cl-socialButtonsBlockButton,.cl-dividerRow,.cl-formFieldRow__phoneNumber,[data-localization-key*=phone],.cl-formField__phoneNumber{display:none!important}@media(max-width:480px){body{padding:15px}.signup-container[data-astro-cid-hcigcqkj]{padding:1rem}.logo-icon[data-astro-cid-hcigcqkj]{width:120px}.cl-card{padding:1.25rem!important;border-radius:12px!important}.cl-formFieldInput{padding:.875rem 1rem!important;font-size:16px!important}.cl-formButtonPrimary{padding:.875rem!important;font-size:16px!important}}@media(max-width:375px){.logo-icon[data-astro-cid-hcigcqkj]{width:100px}.cl-card{padding:1rem!important}}@media(max-height:500px)and (orientation:landscape){.logo-icon[data-astro-cid-hcigcqkj]{width:80px;margin-bottom:.5rem}.signup-container[data-astro-cid-hcigcqkj]{padding:.5rem}}\n"}],"routeData":{"route":"/cadastro","isIndex":false,"type":"page","pattern":"^\\/cadastro\\/?$","segments":[[{"content":"cadastro","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/cadastro.astro","pathname":"/cadastro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.YRIxFgA-.js"}],"styles":[{"type":"external","src":"/_astro/dashboard.DsXbLMIZ.css"}],"routeData":{"route":"/dashboard","isIndex":false,"type":"page","pattern":"^\\/dashboard\\/?$","segments":[[{"content":"dashboard","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/dashboard.astro","pathname":"/dashboard","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.YRIxFgA-.js"}],"styles":[{"type":"external","src":"/_astro/faturamento.CfmXVlt4.css"}],"routeData":{"route":"/faturamento","isIndex":false,"type":"page","pattern":"^\\/faturamento\\/?$","segments":[[{"content":"faturamento","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/faturamento.astro","pathname":"/faturamento","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.YRIxFgA-.js"}],"styles":[{"type":"external","src":"/_astro/ordem.DM9IWlfF.css"}],"routeData":{"route":"/ordem","isIndex":false,"type":"page","pattern":"^\\/ordem\\/?$","segments":[[{"content":"ordem","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/ordem.astro","pathname":"/ordem","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.YRIxFgA-.js"}],"styles":[{"type":"external","src":"/_astro/ordens.DdiKkFei.css"}],"routeData":{"route":"/ordens","isIndex":false,"type":"page","pattern":"^\\/ordens\\/?$","segments":[[{"content":"ordens","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/ordens.astro","pathname":"/ordens","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.YRIxFgA-.js"}],"styles":[{"type":"external","src":"/_astro/produtos.CVgZVHdF.css"}],"routeData":{"route":"/produtos","isIndex":false,"type":"page","pattern":"^\\/produtos\\/?$","segments":[[{"content":"produtos","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/produtos.astro","pathname":"/produtos","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.YRIxFgA-.js"}],"styles":[],"routeData":{"route":"/sso-callback","isIndex":false,"type":"page","pattern":"^\\/sso-callback\\/?$","segments":[[{"content":"sso-callback","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/sso-callback.astro","pathname":"/sso-callback","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.YRIxFgA-.js"}],"styles":[{"type":"external","src":"/_astro/vendas.4IVTJSuA.css"}],"routeData":{"route":"/vendas","isIndex":false,"type":"page","pattern":"^\\/vendas\\/?$","segments":[[{"content":"vendas","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/vendas.astro","pathname":"/vendas","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.YRIxFgA-.js"}],"styles":[{"type":"external","src":"/_astro/index.IirGShpe.css"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["C:/Users/46/Desktop/programa/clerk-astro/src/pages/cadastro.astro",{"propagation":"none","containsHead":true}],["C:/Users/46/Desktop/programa/clerk-astro/src/pages/dashboard.astro",{"propagation":"none","containsHead":true}],["C:/Users/46/Desktop/programa/clerk-astro/src/pages/faturamento.astro",{"propagation":"none","containsHead":true}],["C:/Users/46/Desktop/programa/clerk-astro/src/pages/ordem.astro",{"propagation":"none","containsHead":true}],["C:/Users/46/Desktop/programa/clerk-astro/src/pages/ordens.astro",{"propagation":"none","containsHead":true}],["C:/Users/46/Desktop/programa/clerk-astro/src/pages/produtos.astro",{"propagation":"none","containsHead":true}],["C:/Users/46/Desktop/programa/clerk-astro/src/pages/sso-callback.astro",{"propagation":"none","containsHead":true}],["C:/Users/46/Desktop/programa/clerk-astro/src/pages/vendas.astro",{"propagation":"none","containsHead":true}],["C:/Users/46/Desktop/programa/clerk-astro/src/pages/index.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000noop-middleware":"_noop-middleware.mjs","\u0000virtual:astro:actions/noop-entrypoint":"noop-entrypoint.mjs","\u0000@astro-page:src/pages/cadastro@_@astro":"pages/cadastro.astro.mjs","\u0000@astro-page:src/pages/dashboard@_@astro":"pages/dashboard.astro.mjs","\u0000@astro-page:src/pages/faturamento@_@astro":"pages/faturamento.astro.mjs","\u0000@astro-page:src/pages/ordem@_@astro":"pages/ordem.astro.mjs","\u0000@astro-page:src/pages/ordens@_@astro":"pages/ordens.astro.mjs","\u0000@astro-page:src/pages/produtos@_@astro":"pages/produtos.astro.mjs","\u0000@astro-page:src/pages/sso-callback@_@astro":"pages/sso-callback.astro.mjs","\u0000@astro-page:src/pages/vendas@_@astro":"pages/vendas.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astro-page:node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image.astro.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_CaTq623Y.mjs","C:/Users/46/Desktop/programa/clerk-astro/node_modules/astro/dist/assets/services/sharp.js":"chunks/sharp_CfevHBA6.mjs","astro:scripts/before-hydration.js":"_astro/astro_scripts/before-hydration.js.BnSMYN1b.js","@astrojs/react/client.js":"_astro/client.T9fhd2RU.js","C:/Users/46/Desktop/programa/clerk-astro/node_modules/@clerk/astro/components/control/SignedInCSR.astro?astro&type=script&index=0&lang.ts":"_astro/SignedInCSR.astro_astro_type_script_index_0_lang.BxeYPnj-.js","C:/Users/46/Desktop/programa/clerk-astro/node_modules/@clerk/astro/components/interactive/UserButton/UserButtonMenuItems.astro?astro&type=script&index=0&lang.ts":"_astro/UserButtonMenuItems.astro_astro_type_script_index_0_lang.DjJJDhXb.js","C:/Users/46/Desktop/programa/clerk-astro/node_modules/@clerk/astro/components/control/SignedOutCSR.astro?astro&type=script&index=0&lang.ts":"_astro/SignedOutCSR.astro_astro_type_script_index_0_lang.DUMW6J2H.js","C:/Users/46/Desktop/programa/clerk-astro/node_modules/@clerk/astro/components/control/ProtectCSR.astro?astro&type=script&index=0&lang.ts":"_astro/ProtectCSR.astro_astro_type_script_index_0_lang.B7OIBUi1.js","astro:scripts/page.js":"_astro/page.YRIxFgA-.js","\u0000astro:transitions/client":"_astro/client.Cz7IsWXI.js"},"inlinedScripts":[["C:/Users/46/Desktop/programa/clerk-astro/node_modules/@clerk/astro/components/interactive/UserButton/UserButtonMenuItems.astro?astro&type=script&index=0&lang.ts","class e extends HTMLElement{constructor(){super()}}customElements.define(\"clerk-user-button-menu-items\",e);"]],"assets":["/_astro/dashboard.DsXbLMIZ.css","/_astro/faturamento.CfmXVlt4.css","/_astro/ordem.DM9IWlfF.css","/_astro/ordens.DdiKkFei.css","/_astro/produtos.CVgZVHdF.css","/_astro/vendas.4IVTJSuA.css","/_astro/index.IirGShpe.css","/favicon.ico","/favicon.svg","/logo.png","/js/scartech-cloud.js","/_astro/BaseClerkControlElement.DLD9M1q3.js","/_astro/chunk-MZTESQVU.DFZtgiu1.js","/_astro/client.Cz7IsWXI.js","/_astro/client.T9fhd2RU.js","/_astro/index.Ca77h9Vs.js","/_astro/page.YRIxFgA-.js","/_astro/ProtectCSR.astro_astro_type_script_index_0_lang.B7OIBUi1.js","/_astro/SignedInCSR.astro_astro_type_script_index_0_lang.BxeYPnj-.js","/_astro/SignedOutCSR.astro_astro_type_script_index_0_lang.DUMW6J2H.js","/_astro/astro_scripts/before-hydration.js.BnSMYN1b.js","/_astro/page.YRIxFgA-.js"],"buildFormat":"directory","checkOrigin":true,"allowedDomains":[],"serverIslandNameMap":[],"key":"fp1+OjPoLjeznylazjQslpbfiRX3KQUl7+DJtvMN4PA="});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = null;
export {
  manifest
};
