import { e as createComponent, k as renderComponent, p as renderScript, r as renderTemplate, h as createAstro, n as renderSlot } from "./astro/server_KVWy4EfK.mjs";
import "piccolore";
import "clsx";
const $$Astro$5 = createAstro();
const $$SignedInCSR = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$5, $$props, $$slots);
  Astro2.self = $$SignedInCSR;
  const { class: className } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "clerk-signed-in", "clerk-signed-in", { "class": className, "hidden": true }, { "default": () => renderTemplate` ${renderSlot($$result, $$slots["default"])} ` })} ${renderScript($$result, "C:/Users/46/Desktop/programa/clerk-astro/node_modules/@clerk/astro/components/control/SignedInCSR.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/46/Desktop/programa/clerk-astro/node_modules/@clerk/astro/components/control/SignedInCSR.astro", void 0);
const $$Astro$4 = createAstro();
const $$SignedInSSR = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$SignedInSSR;
  const { userId } = Astro2.locals.auth();
  return renderTemplate`${userId ? renderTemplate`${renderSlot($$result, $$slots["default"])}` : null}`;
}, "C:/Users/46/Desktop/programa/clerk-astro/node_modules/@clerk/astro/components/control/SignedInSSR.astro", void 0);
const configOutput = "server";
function isStaticOutput(forceStatic) {
  if (forceStatic !== void 0) {
    return forceStatic;
  }
  return configOutput === "static";
}
const $$Astro$3 = createAstro();
const $$SignedIn = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$SignedIn;
  const { isStatic, class: className } = Astro2.props;
  const shouldUseCSR = isStatic !== void 0 ? isStaticOutput(isStatic) : !Astro2.locals.auth;
  const SignedInComponent = shouldUseCSR ? $$SignedInCSR : $$SignedInSSR;
  return renderTemplate`${renderComponent($$result, "SignedInComponent", SignedInComponent, { "class": className }, { "default": ($$result2) => renderTemplate` ${renderSlot($$result2, $$slots["default"])} ` })}`;
}, "C:/Users/46/Desktop/programa/clerk-astro/node_modules/@clerk/astro/components/control/SignedIn.astro", void 0);
const $$Astro$2 = createAstro();
const $$SignedOutCSR = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$SignedOutCSR;
  const { class: className } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "clerk-signed-out", "clerk-signed-out", { "class": className, "hidden": true }, { "default": () => renderTemplate` ${renderSlot($$result, $$slots["default"])} ` })} ${renderScript($$result, "C:/Users/46/Desktop/programa/clerk-astro/node_modules/@clerk/astro/components/control/SignedOutCSR.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/46/Desktop/programa/clerk-astro/node_modules/@clerk/astro/components/control/SignedOutCSR.astro", void 0);
const $$Astro$1 = createAstro();
const $$SignedOutSSR = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$SignedOutSSR;
  const { userId } = Astro2.locals.auth();
  return renderTemplate`${!userId ? renderTemplate`${renderSlot($$result, $$slots["default"])}` : null}`;
}, "C:/Users/46/Desktop/programa/clerk-astro/node_modules/@clerk/astro/components/control/SignedOutSSR.astro", void 0);
const $$Astro = createAstro();
const $$SignedOut = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$SignedOut;
  const { isStatic, class: className } = Astro2.props;
  const shouldUseCSR = isStatic !== void 0 ? isStaticOutput(isStatic) : !Astro2.locals.auth;
  const SignedOutComponent = shouldUseCSR ? $$SignedOutCSR : $$SignedOutSSR;
  return renderTemplate`${renderComponent($$result, "SignedOutComponent", SignedOutComponent, { "class": className }, { "default": ($$result2) => renderTemplate` ${renderSlot($$result2, $$slots["default"])} ` })}`;
}, "C:/Users/46/Desktop/programa/clerk-astro/node_modules/@clerk/astro/components/control/SignedOut.astro", void 0);
export {
  $$SignedIn as $,
  $$SignedOut as a
};
