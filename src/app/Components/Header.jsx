"use client";
import React, { useState, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

const Header = ({
  isSidebarOpen,
  setIsSidebarOpen,
  selectedCity,
  setSelectedCity,
  user,
  onOpenAuth,
  onLogout,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const cities = ["Dhaka", "Chattogram", "Rajshahi", "Khulna", "Sylhet", "Barishal"];

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const now = isClient ? new Date() : null;
  const today = now
    ? now.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const hour = now ? now.getHours() : 12;
  const greeting = !now
    ? "Welcome!"
    : hour < 12
    ? "Good Morning!"
    : hour < 18
    ? "Good Afternoon!"
    : "Good Evening!";

  return (
    <header className="w-full bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 sticky top-0 z-20">
      {/* বাম পাশ: Dashboard বাটন + Greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition shadow-sm cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>Dashboard</span>
        </button>

        <div className="hidden sm:block border-l border-gray-200 pl-3">
          <h2 className="text-base font-semibold text-gray-800">
            {user ? `${greeting} ${user.name}` : greeting}
          </h2>
          <p className="text-xs text-gray-500">Latest dengue surveillance update</p>
        </div>
      </div>

      
      <div className="hidden sm:flex items-center gap-3 lg:gap-4 text-sm ml-auto">
        <div className="hidden lg:block px-3 py-1.5 bg-gray-100 rounded-lg font-medium text-gray-700">
          📅 {today}
        </div>
        <span className="hidden lg:inline text-gray-300">|</span>

        <div className="flex items-center gap-2">
          <label htmlFor="city-select" className="text-gray-600 font-medium">
            📍 City:
          </label>
          <select
            id="city-select"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        
      </div>

      
      <div className="relative sm:hidden ml-auto">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 focus:outline-none"
          aria-label="Mobile Options"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {isMobileMenuOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 p-4 space-y-3 z-30">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {user ? `${greeting} ${user.name}` : greeting}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">📅 {today}</p>
            </div>
            <hr className="border-gray-100" />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                📍 Select City:
              </label>
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-gray-50 font-medium text-gray-800"
              >
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {onOpenAuth && (
              <>
                <hr className="border-gray-100" />
                {user ? (
                  <div className="space-y-2">
                    <p className="text-xs text-emerald-700 font-medium">
                      Signed in as {user.name}
                    </p>
                    <button
                      onClick={() => {
                        onLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full py-1.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      onOpenAuth();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                  >
                    Sign In
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;