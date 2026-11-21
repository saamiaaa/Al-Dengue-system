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
          className="fixed inset-0 bg-black/40 z-30 transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-slate-900 text-white flex flex-col z-40 transform transition-transform duration-300 ease-in-out shadow-2xl ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-wide text-red-400">
              🦟 AI Dengue System
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Surveillance Dashboard</p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                setActiveTab(item.name);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === item.name
                  ? "bg-red-600 text-white shadow"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
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