import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "./store";

import {
  clearUser,
  setAuthLoading,
  setUser,
} from "./store/slices/authSlices";

import {
  getMe,
  refreshAccessToken,
} from "./services/auth.services";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Network from "./pages/Network";
import Search from "./pages/Search";
import UserProfile from "./pages/UserProfile";
import Messages from "./pages/Messages";

function App() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        let response;

        try {
          response = await getMe();
        } catch (error: any) {
          if (error.response?.status !== 401) {
            throw error;
          }

          await refreshAccessToken();

          response = await getMe();
        }

        if (response.success && response.data?.user) {
          dispatch(setUser(response.data.user));
        } else {
          dispatch(clearUser());
        }
      } catch {
        dispatch(clearUser());
      } finally {
        dispatch(setAuthLoading(false));
      }
    };

    initializeAuth();
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>

        {/* Public routes */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        {/* Protected application */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>

            <Route
              path="/app/feed"
              element={<Feed />}
            />

            <Route
              path="/app/network"
              element={<Network />}
            />

            <Route
              path="/app/search"
              element={<Search />}
            />

            <Route
              path="/app/profile"
              element={<Profile />}
            />

            <Route
              path="/app/profile/:userId"
              element={<UserProfile />}
            />

            <Route
              path="/app/messages"
              element={<Messages />}
            />

          </Route>
        </Route>

        {/* Default */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;