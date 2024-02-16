import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";

import { Projects, Home, NotFound, Wordleverse } from "./pages";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
    errorElement: <NotFound />,
  },
  {
    path: "/wordle",
    element: <Navigate to="/wordleverse" replace />,
  },
  {
    path: "/wordleverse",
    element: <Wordleverse />,
  },
  {
    path: "/projects",
    element: <Projects />,
  },
]);

export const Routes = () => <RouterProvider router={router} />;
