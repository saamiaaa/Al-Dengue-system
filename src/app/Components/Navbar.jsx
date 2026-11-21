
"use client";
import React, { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Overview from "./Overview";
import RiskMap from "./RiskMap";
import Analytics from "./Analytics";
import WardMonitoring from "./WardMonitoring";
import { Alerts, Reports, Settings, HelpAbout } from "./OtherTabs";

const Navbar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("Chattogram");
  const [activeTab, setActiveTab] = useState("Home");

  const renderMainContent = () => {
    if (activeTab === "Home") {
      return (
        <div className="bg-white/95 p-8 sm:p-12 rounded-2xl border border-gray-200 shadow-sm text-center max-w-2xl mx-auto mt-10 space-y-4">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
            🦟 Municipal Early-Warning System
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            AI Dengue Outbreak &amp; Ward Surveillance
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Real-time vector risk scoring across 60 municipal wards in Bangladesh. Select a module from the menu or jump straight into the live surveillance dashboard for <strong>{selectedCity}</strong>.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setActiveTab("Overview")}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition cursor-pointer"
            >
              📊 Open Overview Dashboard
            </button>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition cursor-pointer"
            >
              ☰ Explore All Modules
            </button>
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
        return (
          <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm text-center space-y-2">
            <h2 className="text-xl font-bold text-gray-800">{activeTab}</h2>
            <p className="text-sm text-gray-500">
              AI ML Inference module ready for backend endpoint integration.
            </p>
          </div>
        );
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `linear-gradient(rgba(241, 245, 249, 0.72), rgba(248, 250, 252, 0.82)), url('/dengue.jpg')`,
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

      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
        {renderMainContent()}
      </main>
    </div>
  );
};

export default Navbar;