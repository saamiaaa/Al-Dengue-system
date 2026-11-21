
"use client";
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Overview from "./Overview";

const Navbar = () => {
  
  const [activeTab, setActiveTab] = useState("Home");
  const [selectedCity, setSelectedCity] = useState("Dhaka");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div
      className="min-h-screen flex text-gray-900 relative overflow-x-hidden bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(248, 250, 252, 0.78), rgba(241, 245, 249, 0.88)), url('https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&w=1920&q=80')`,
      }}
    >
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          selectedCity={selectedCity}
          setSelectedCity={setSelectedCity}
        />

        <main className="flex-1 p-4 sm:p-6 flex flex-col">
         
          {activeTab === "Home" ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-12">
              <span className="px-3.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold tracking-wide uppercase mb-4">
                🦟 Real-Time Surveillance & AI Forecasting
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                AI-Powered Dengue Outbreak & Hospital Monitoring System
              </h1>
              <p className="text-gray-600 mt-4 text-sm sm:text-base leading-relaxed">
                Monitor real-time dengue cases in <strong>{selectedCity}</strong>, predict high-risk zones using AI, and track hospital ward & platelet availability.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md transition cursor-pointer"
                >
                  Open Dashboard Menu
                </button>
                <button
                  onClick={() => setActiveTab("Overview")}
                  className="px-6 py-3 rounded-xl bg-white/90 hover:bg-white text-slate-800 border border-gray-300 font-semibold text-sm shadow-sm transition cursor-pointer"
                >
                  Quick View: Overview
                </button>
              </div>
            </div>
          ) : activeTab === "Overview" ? (
            
            <Overview selectedCity={selectedCity} />
          ) : (
            <div className="p-6 bg-white/90 rounded-xl border border-gray-200 text-gray-600">
              Selected Tab: <strong>{activeTab}</strong> (Coming soon...)
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Navbar;