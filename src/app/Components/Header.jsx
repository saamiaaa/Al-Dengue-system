"use client";
import React, { useState, useEffect, useRef } from "react";

const Header = ({
  isSidebarOpen,
  setIsSidebarOpen,
  selectedCity,
  setSelectedCity,
}) => {
  const cities = [
    "Chattogram",
    "Dhaka North",
    "Dhaka South",
    "Gazipur",
    "Narayanganj",
  ];
  const [greeting, setGreeting] = useState("Welcome!");
  const [isMobileCityOpen, setIsMobileCityOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) setGreeting("Good Morning!");
      else if (hour >= 12 && hour < 18) setGreeting("Good Afternoon!");
      else if (hour >= 18 && hour < 21) setGreeting("Good Evening!");
      else setGreeting("Good Night!");
    };

    const timer = setTimeout(updateGreeting, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target)
      ) {
        setIsMobileCityOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-200/70 shadow-sm px-3 sm:px-6 py-3 transition-all">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
         <button
  type="button"
  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
  className="group shrink-0 flex items-center gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md hover:bg-gradient-to-r hover:from-red-600 hover:to-rose-600 text-white font-bold text-xs sm:text-sm border border-slate-700/80 hover:border-rose-400/50 shadow-lg shadow-slate-900/20 hover:shadow-rose-600/30 active:scale-95 transition-all duration-200 cursor-pointer"
>
  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 group-hover:bg-white/20 text-rose-400 group-hover:text-white transition-colors">
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
    </svg>
  </span>

  <span className="whitespace-nowrap tracking-tight">
    Dengue<span className="text-rose-400 group-hover:text-amber-200 transition-colors">Sense</span>
  </span>
</button>

          <div className="hidden sm:block h-8 w-px bg-slate-300/70" />

          <div className="hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-2xl bg-white/75 backdrop-blur-md border border-white/60 shadow-xs">
  {/* Vertical Accent Bar */}
  <div className="w-1 h-8 rounded-full bg-gradient-to-b from-red-600 to-rose-400" />

  <div>
    <div className="flex items-center gap-2">
      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-none">
        {greeting}
      </h2>
      <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200/80">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
        Live Sync
      </span>
    </div>

    <p className="text-[11px] text-slate-600 font-medium mt-1 leading-none">
      Municipal dengue vector &amp; outbreak command
    </p>
  </div>
</div>
        </div>

        <div className="group relative hidden sm:flex items-center bg-gradient-to-b from-white to-slate-50 hover:from-red-50/40 hover:to-white rounded-xl border border-slate-300/90 hover:border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200">
          <span className="pointer-events-none pl-3.5 pr-1.5 text-xs font-semibold text-slate-500 group-hover:text-red-600 flex items-center gap-1 transition-colors">
            📍 <span>City:</span>
          </span>
          <select
            aria-label="Select City"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="appearance-none bg-transparent font-bold text-sm text-slate-900 group-hover:text-red-700 py-2 pr-8 pl-1 focus:outline-none cursor-pointer transition-colors"
          >
            {cities.map((city) => (
              <option key={city} value={city} className="bg-white text-slate-900 font-medium">
                {city}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 text-slate-400 group-hover:text-red-600 group-hover:translate-y-0.5 transition-all duration-200">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </div>

        <div className="relative sm:hidden" ref={mobileMenuRef}>
          <button
            type="button"
            aria-label="Select City"
            onClick={() => setIsMobileCityOpen(!isMobileCityOpen)}
            className={`flex items-center justify-center w-9 h-9 rounded-xl border shadow-xs active:scale-90 transition-all duration-200 cursor-pointer ${
              isMobileCityOpen
                ? "bg-red-600 text-white border-red-600 shadow-md shadow-red-600/25"
                : "bg-white hover:bg-slate-100 text-slate-900 border-slate-200"
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle cx="5" cy="12" r="2.3" />
              <circle cx="12" cy="12" r="2.3" />
              <circle cx="19" cy="12" r="2.3" />
            </svg>
          </button>

          {isMobileCityOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 z-50">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                📍 Select City
              </div>
              {cities.map((city) => {
                const isSelected = selectedCity === city;
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      setSelectedCity(city);
                      setIsMobileCityOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between active:scale-[0.98] transition cursor-pointer ${
                      isSelected
                        ? "bg-red-50 text-red-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{city}</span>
                    {isSelected && <span className="text-red-600 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex sm:hidden items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-xs">
        <span className="font-bold text-slate-800">{greeting}</span>
        <button
          type="button"
          onClick={() => setIsMobileCityOpen(!isMobileCityOpen)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-700 active:scale-95 px-2 py-0.5 rounded-md transition cursor-pointer"
        >
          📍 <strong className="text-slate-900">{selectedCity}</strong> ▾
        </button>
      </div>
    </header>
  );
};

export default Header;