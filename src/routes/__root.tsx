import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "Spread";
const SITE_DESCRIPTION =
  "A weekly planner that starts with time. Name your responsibilities, give each one hours, then plan real days. Your planning stays on your device.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" },
      { title: `${APP_NAME} · A little more room for what matters` },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "theme-color", content: "#000000" },
    ],
    links: [
      { rel: "canonical", href: "https://thespreadapp.com/" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
    scripts: [
      {
        children: `(function(){try{var raw=localStorage.getItem("spread.profiles")||localStorage.getItem("spread.people");var active=localStorage.getItem("spread.profile")||localStorage.getItem("spread.person");var theme=localStorage.getItem("spread.theme");if(raw&&active){var list=JSON.parse(raw);if(Array.isArray(list)){for(var i=0;i<list.length;i++){var row=list[i];if(row&&row.id===active&&(row.theme==="light"||row.theme==="dark"||row.theme==="system")){theme=row.theme;break}}}}if(theme==="light"||theme==="dark")document.documentElement.setAttribute("data-theme",theme);var cap=window.Capacitor;if(cap&&cap.isNativePlatform&&cap.isNativePlatform())document.documentElement.setAttribute("data-spread","in");}catch(e){}})();`,
      },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
});
