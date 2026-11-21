"use client";
import React from "react";

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen, activeTab, setActiveTab }) => {
  const menuItems = [
    { name: "Overview", icon: "📊" },
    { name: "AI Predictions", icon: "🤖" },
    { name: "Risk Map", icon: "🗺️" },
    { name: "Analytics", icon: "📈" },
    { name: "Ward Monitoring", icon: "🏥" },
    { name: "Alerts & Recom", icon: "🚨" },
    { name: "Data & Reports", icon: "📁" },
    { name: "Settings", icon: "⚙️" },
    { name: "Help & About", icon: "ℹ️" },
  ];

  return (
    <>
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-30 transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-slate-950/95 via-slate-900/92 to-rose-950/95 backdrop-blur-xl text-white border-r border-white/10 flex flex-col z-40 transform transition-transform duration-300 ease-in-out shadow-2xl ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-wide text-rose-400">
              🦟 AI Dengue System
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Surveillance Dashboard</p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                setActiveTab(item.name);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === item.name
                  ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;