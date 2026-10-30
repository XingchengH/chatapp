import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import RootLayout from "./components/RootLayout";
const HomePage = lazy(() => import("./pages/HomePage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const Loading = () => (
  <div
    role="status"
    aria-label="Loading"
    className="flex items-center justify-center h-screen"
  >
    <Loader className="size-10 animate-spin" />
  </div>
);
function AuthRoute({
  children,
  guest = false,
}: {
  children: ReactNode;
  guest?: boolean;
}) {
  const authUser = useAuthStore((state) => state.authUser);
  return guest ? (
    authUser ? (
      <Navigate to="/" replace />
    ) : (
      children
    )
  ) : authUser ? (
    children
  ) : (
    <Navigate to="/login" replace />
  );
}
const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <AuthRoute>
            <HomePage />
          </AuthRoute>
        ),
      },
      { path: "settings", element: <SettingsPage /> },
      {
        path: "profile",
        element: (
          <AuthRoute>
            <ProfilePage />
          </AuthRoute>
        ),
      },
      {
        path: "signup",
        element: (
          <AuthRoute guest>
            <SignupPage />
          </AuthRoute>
        ),
      },
      {
        path: "login",
        element: (
          <AuthRoute guest>
            <LoginPage />
          </AuthRoute>
        ),
      },
    ],
  },
]);
export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth);
  const appTheme = useThemeStore((state) => state.appTheme);
  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", appTheme);
  }, [appTheme]);
  return (
    <>
      <Toaster position="top-center" />
      {isCheckingAuth ? (
        <Loading />
      ) : (
        <Suspense fallback={<Loading />}>
          <RouterProvider router={router} />
        </Suspense>
      )}
    </>
  );
}
