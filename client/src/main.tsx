import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./state/theme";
import { ProfileProvider } from "./state/profile";
import { AuthSync } from "./state/authSync";
import { queryClient } from "./lib/queryClient";
import { appRouter } from "./app/routes";
import "./styles/index.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthSync>
          <ProfileProvider>
            <RouterProvider router={appRouter} />
          </ProfileProvider>
        </AuthSync>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>
);
