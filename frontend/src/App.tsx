import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import HomePage from "./pages/HomePage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect } from "react";
import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";
import RootLayout from "./components/RootLayout";
import { useThemeStore } from "./store/useThemeStore";

export const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { appTheme } = useThemeStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", appTheme);
  }, [appTheme]);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }

  const router = createBrowserRouter([
    {
      path: "/",
      element: <RootLayout />,
      children: [
        {
          index: true,
          element: authUser ? <HomePage /> : <Navigate to="/login" />,
        },
        {
          path: "settings",
          element: <SettingsPage />,
        },
        {
          path: "profile",
          element: authUser ? <ProfilePage /> : <Navigate to="/login" />,
        },
        {
          path: "signup",
          element: !authUser ? <SignupPage /> : <Navigate to="/" />,
        },
        {
          path: "login",
          element: authUser ? <Navigate to="/" /> : <LoginPage />,
        },
      ],
    },
  ]);

  return (
    <div>
      <Toaster position="top-center" />
      <RouterProvider router={router} />
    </div>
  );
};

export default App;
