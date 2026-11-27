"use client";
import React, { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Overview from "./Overview";
import RiskMap from "./RiskMap";
import Analytics from "./Analytics";
import WardMonitoring from "./WardMonitoring";
import { Alerts, Reports, Settings, HelpAbout } from "./OtherTabs";
import Predictions from "./Predictions";

const Navbar = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("Chattogram");
  const [activeTab, setActiveTab] = useState("Home");

  const renderMainContent = () => {
    if (activeTab === "Home") {
      return (
       <div className="relative min-h-[calc(100vh-110px)] flex items-center justify-center px-4 py-8">
  {/* Front-Page Only Full-Screen Background Image */}
  <div
    className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
    style={{ backgroundImage: "url('Background/.png')" }}
  />

  {/* Dark Cyber-Glass Command Card */}
  <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl border border-white/20 bg-slate-950/80 backdrop-blur-2xl shadow-[0_25px_70px_-15px_rgba(15,23,42,0.85)] p-7 sm:p-11 text-center text-white space-y-6">
    {/* Ambient Glow Accents */}
    <div className="pointer-events-none absolute -top-24 -left-24 h-60 w-60 rounded-full bg-rose-600/25 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-24 -right-24 h-60 w-60 rounded-full bg-sky-500/20 blur-3xl" />

    {/* Top Glass Edge Highlight */}
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

    {/* Status & Domain Pill */}
    <div className="relative flex flex-wrap items-center justify-center gap-2.5">
      <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono text-[11px] font-bold uppercase tracking-widest bg-rose-500/15 text-rose-200 border border-rose-400/30">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
        </span>
        Municipal Early-Warning System
      </span>

      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
        ● {selectedCity} Active
      </span>
    </div>

    {/* Main Headline */}
    <div className="relative space-y-3">
      <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.15] text-white">
        AI Dengue Outbreak &amp;{" "}
        <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-red-400 bg-clip-text text-transparent">
          Ward Surveillance
        </span>
      </h1>

      <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
        Real-time vector risk scoring and{" "}
        <strong className="text-white font-semibold">2–4 week ML outbreak forecasting</strong>{" "}
        across 60 municipal wards in Bangladesh. Select a module from the menu or jump straight into the live command center for{" "}
        <strong className="text-rose-300 font-bold">{selectedCity}</strong>.
      </p>
    </div>

    {/* Primary & Secondary Action Buttons */}
    <div className="relative pt-2 flex flex-wrap items-center justify-center gap-3.5">
      <button
        type="button"
        onClick={() => setActiveTab("Overview")}
        className="group relative inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white font-extrabold text-sm tracking-wide border border-rose-300/30 shadow-[0_12px_30px_-6px_rgba(225,29,72,0.55)] hover:shadow-[0_16px_36px_-4px_rgba(244,63,94,0.75)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300 cursor-pointer select-none overflow-hidden"
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/15 border border-white/20 transition-transform duration-300 group-hover:scale-110">
          <svg
            className="w-3.5 h-3.5 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
          </svg>
        </span>

        <span>Open Overview Dashboard</span>

        <svg
          className="w-4 h-4 text-rose-100 transition-transform duration-300 group-hover:translate-x-1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab("Predictions")}
        className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-sm tracking-wide hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer"
      >
        <span>ML Forecast Simulator</span>
        <span className="font-mono text-xs text-amber-300">2–4W</span>
      </button>
    </div>

    {/* Bottom Quick Telemetry Strip */}
    <div className="relative pt-5 border-t border-white/15 grid grid-cols-3 gap-2 sm:gap-4 text-center">
      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Coverage</p>
        <p className="text-xs sm:text-sm font-extrabold text-amber-300 mt-0.5">60 Wards</p>
      </div>
      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Model R²</p>
        <p className="text-xs sm:text-sm font-extrabold text-sky-300 mt-0.5">0.89 XGBoost</p>
      </div>
      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Dispatch</p>
        <p className="text-xs sm:text-sm font-extrabold text-emerald-300 mt-0.5">Live Triage</p>
      </div>
    </div>
  </div>
</div>
      );
    }

    switch (activeTab) {
      case "Overview":
        return <Overview selectedCity={selectedCity} />;
      case "Risk Map":
        return <RiskMap selectedCity={selectedCity} />;
      case "Analytics":
        return <Analytics selectedCity={selectedCity} />;
      case "Ward Monitoring":
        return <WardMonitoring selectedCity={selectedCity} />;
      case "Alerts & Recom":
        return <Alerts selectedCity={selectedCity} />;
      case "Data & Reports":
        return <Reports selectedCity={selectedCity} />;
      case "Settings":
        return <Settings />;
      case "Help & About":
        return <HelpAbout />;
      default:
        return <Predictions selectedCity={selectedCity} />;
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `linear-gradient(rgba(241, 245, 249, 0.35), rgba(248, 250, 252, 0.45)), url('/dengue.jpg')`,
      }}
    >
      <Header
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
      />

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 rounded-3xl bg-slate-950/40 backdrop-blur-md border border-white/10 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.5)] my-2 sm:my-4">
        {renderMainContent()}
        
        {activeTab === "Overview" && children}
      </main>
    </div>
  );
};

export default Navbar;