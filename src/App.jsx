import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { Home } from "./pages";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />
  }
]);

export const App = () => (
  <RouterProvider router={router} />
)