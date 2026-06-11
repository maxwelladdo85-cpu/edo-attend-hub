import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import { Toaster } from "./components/ui/sonner";
import "./styles.css";

// On hard reload, always return to the sign-in page
const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
if (navEntry?.type === "reload" && window.location.pathname !== "/login") {
  window.location.href = "/login";
}

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: { queryClient },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </StrictMode>
  );
}

// Initialize native shell after render (non-blocking)
import("./lib/native-init").then(({ initNativeShell }) => initNativeShell());
