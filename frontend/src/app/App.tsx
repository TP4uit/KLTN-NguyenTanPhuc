import { RouterProvider } from "react-router";
import { AuthProvider } from "./lib/authContext";
import { router } from "./routes";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
