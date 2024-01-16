import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { Home, NotFound, Wordle } from "./pages";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
    errorElement: <NotFound />,
  },
  {
    path: "/wordle",
    element: <Wordle />
  }
]);

export const App = () => (
  <RouterProvider router={router} />
)