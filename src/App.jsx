import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { Home, NotFound, WordleGame } from "./pages";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
    errorElement: <NotFound />,
  },
  {
    path: "/wordle",
    element: <WordleGame />
  }
]);

export const App = () => (
  <RouterProvider router={router} />
)