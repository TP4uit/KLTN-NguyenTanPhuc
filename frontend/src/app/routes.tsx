import { createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { Results } from "./pages/Results";
import { Admin } from "./pages/Admin";
import { Audit } from "./pages/Audit";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Account } from "./pages/Account";
import { RequireAuth, RequireRole } from "./components/RequireAuth";

export const router = createBrowserRouter([
  {
    path: "/",
    children: [
      { index: true, Component: Home },
      { path: "login", Component: Login },
      { path: "register", Component: Register },
      {
        path: "dashboard",
        element: (
          <RequireAuth message="Sign in to open the voter dashboard.">
            <Dashboard />
          </RequireAuth>
        ),
      },
      { path: "results", Component: Results },
      {
        path: "account",
        element: (
          <RequireAuth message="Sign in to view your demo account.">
            <Account />
          </RequireAuth>
        ),
      },
      {
        path: "admin",
        element: (
          <RequireRole role="ADMIN" message="Sign in with an admin demo account to open admin controls.">
            <Admin />
          </RequireRole>
        ),
      },
      {
        path: "audit",
        element: (
          <RequireRole roles={["ADMIN", "AUDITOR"]} message="Sign in with an auditor or admin demo account to verify audit exports.">
            <Audit />
          </RequireRole>
        ),
      },
    ],
  },
]);
