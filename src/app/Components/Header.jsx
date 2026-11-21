"use client";
import React, { useState, useEffect } from "react";

const Header = ({
  isSidebarOpen,
  setIsSidebarOpen,
  selectedCity,
  setSelectedCity,
}) => {
  const cities = ["Chattogram", "Dhaka", "Rajshahi", "Khulna", "Sylhet"];
  const [greeting, setGreeting] = useState("Welcome!");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning!");
    else if (hour < 18) setGreeting("Good Afternoon!");
    else setGreeting("Good Evening!");
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-white/75 backdrop-blur-xl border-b border-white/60 shadow-sm px-4 sm:px-6 py-3.5 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* বাম পাশ: মডার্ন মেনু বাটন + গ্রিটিং */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 hover:from-red-600 hover:to-rose-600 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:shadow-red-600/25 transition-all duration-300 cursor-pointer"
          >
            <span className="text-base leading-none">☰</span>
            <span>Dashboard</span>
          </button>

          <div className="hidden sm:block h-8 w-px bg-slate-300/70" />

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {greeting}
              </h2>
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100/90 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Surveillance
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Latest dengue vector & outbreak telemetry
            </p>
          </div>
        </div>

        {/* ডান পাশ: মডার্ন সিটি সিলেক্টর কন্ট্রোল */}
        <div className="flex items-center gap-2.5 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            📍 <span className="hidden sm:inline">City:</span>
          </span>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-transparent font-bold text-sm text-slate-900 focus:outline-none cursor-pointer pr-1"
          >
            {cities.map((city) => (
              <option key={city} value={city} className="bg-white text-slate-900">
                {city}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};

export default Header;