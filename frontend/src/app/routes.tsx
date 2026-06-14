import { createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { Results } from "./pages/Results";
import { Admin } from "./pages/Admin";

export const router = createBrowserRouter([
  {
    path: "/",
    children: [
      { index: true, Component: Home },
      { path: "dashboard", Component: Dashboard },
      { path: "results", Component: Results },
      { path: "admin", Component: Admin },
    ],
  },
]);
