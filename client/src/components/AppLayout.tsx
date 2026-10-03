import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { clearUser } from "../store/slices/authSlices";
import { logout } from "../services/auth.services";

function AppLayout() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const user = useSelector(
    (state: RootState) => state.auth.user,
  );

  const [isProfileMenuOpen, setIsProfileMenuOpen] =
    useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Clear local authentication even if the API request fails.
    } finally {
      dispatch(clearUser());
      navigate("/login", { replace: true });
    }
  };

  const navLinkClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-white/10 text-white"
        : "text-slate-300 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-navy">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            to="/app/feed"
            className="text-xl font-bold tracking-tight text-white"
          >
            Connect<span className="text-primary">Sphere</span>
          </Link>

          {/* Main navigation */}
          <div className="hidden items-center gap-1 md:flex">
            <NavLink
              to="/app/feed"
              className={navLinkClass}
            >
              Feed
            </NavLink>

            <NavLink
              to="/app/network"
              className={navLinkClass}
            >
              Network
            </NavLink>

            <NavLink
              to="/app/search"
              className={navLinkClass}
            >
              Search
            </NavLink>

            <NavLink
              to="/app/messages"
              className={navLinkClass}
            >
              Messages
            </NavLink>
          </div>

          {/* Profile menu */}
          {user && (
            <div
              ref={menuRef}
              className="relative"
            >
              <button
                type="button"
                onClick={() =>
                  setIsProfileMenuOpen((current) => !current)
                }
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-white/5"
              >
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-white">
                    {user.name}
                  </p>

                  {user.headline && (
                    <p className="max-w-40 truncate text-xs text-slate-400">
                      {user.headline}
                    </p>
                  )}
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>

                <svg
                  className={`hidden h-4 w-4 text-slate-400 transition sm:block ${
                    isProfileMenuOpen ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
                  <div className="border-b border-border px-4 py-3">
                    <p className="font-semibold text-text">
                      {user.name}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-muted">
                      {user.email}
                    </p>
                  </div>

                  <div className="p-1.5">
                    <Link
                      to="/app/profile"
                      onClick={() =>
                        setIsProfileMenuOpen(false)
                      }
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text transition hover:bg-background"
                    >
                      <span className="text-muted">👤</span>
                      View Profile
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-danger transition hover:bg-red-50"
                    >
                      <span>↪</span>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;