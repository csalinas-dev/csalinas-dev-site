import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";

import {
  Hashtag,
  HashtagInstructions,
  Home,
  NotFound,
  Project,
  Projects,
  Wordleverse,
  WordleverseInstructions,
} from "pages";

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
  {
    path: "/hashtag",
    element: <Hashtag />,
  },
  {
    path: "/hashtag/instructions",
    element: <HashtagInstructions />,
  },
]);

export const Routes = () => <RouterProvider router={router} />;
