import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";

import {
  Home,
  WordleverseInstructions,
  NotFound,
  Project,
  Projects,
  Wordleverse,
} from "./pages";

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
    path: "/wordleverse/instructions",
    element: <WordleverseInstructions />,
  },
  {
    path: "/projects",
    element: <Projects />,
  },
  {
    path: "/projects/:slug",
    element: <Project />,
  },
]);

export const Routes = () => <RouterProvider router={router} />;
