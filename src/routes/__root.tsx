import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "Spread";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" },
      { title: APP_NAME },
      { name: "description", content: "The weekly role spread. Give each part of your life a box of hours." },
      { name: "theme-color", content: "#000000" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
    scripts: [
      {
        children: `(function(){try{var raw=localStorage.getItem("spread.profiles")||localStorage.getItem("spread.people");var active=localStorage.getItem("spread.profile")||localStorage.getItem("spread.person");var theme=localStorage.getItem("spread.theme");if(raw&&active){var list=JSON.parse(raw);if(Array.isArray(list)){for(var i=0;i<list.length;i++){var row=list[i];if(row&&row.id===active&&(row.theme==="light"||row.theme==="dark"||row.theme==="system")){theme=row.theme;break}}}}if(theme==="light"||theme==="dark")document.documentElement.setAttribute("data-theme",theme);var license=localStorage.getItem("spread.license");if(license){var parsed=JSON.parse(license);if(parsed&&parsed.ok===true&&(parsed.plan==="demo"||parsed.plan==="personal"))document.documentElement.setAttribute("data-spread","in")}}catch(e){}})();`,
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
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
