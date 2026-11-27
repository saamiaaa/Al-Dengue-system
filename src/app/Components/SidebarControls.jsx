"use client";

import React from 'react';

export const CITY_WARDS_MAP = {
  'Dhaka North': Array.from({ length: 20 }, (_, i) => `DNCC_Ward_${String(i + 1).padStart(2, '0')}`),
  'Dhaka South': Array.from({ length: 20 }, (_, i) => `DSCC_Ward_${String(i + 1).padStart(2, '0')}`),
  'Chattogram': Array.from({ length: 10 }, (_, i) => `CCC_Ward_${String(i + 1).padStart(2, '0')}`),
  'Gazipur': Array.from({ length: 5 }, (_, i) => `GCC_Ward_${String(i + 1).padStart(2, '0')}`),
  'Narayanganj': Array.from({ length: 5 }, (_, i) => `NCC_Ward_${String(i + 1).padStart(2, '0')}`),
};

const SidebarControls = ({
  selectedCity,
  setSelectedCity,
  selectedWard,
  setSelectedWard,
  stockPercentage,
  setStockPercentage,
  totalCrews,
  setTotalCrews,
  isOfflineMode,
  onResetDefaults,
}) => {
  const cities = Object.keys(CITY_WARDS_MAP);
  const availableWards = selectedCity === 'ALL' ? [] : CITY_WARDS_MAP[selectedCity] || [];

  const handleCityChange = (e) => {
    const newCity = e.target.value;
    setSelectedCity(newCity);
    setSelectedWard('ALL');
  };

  const getStockStatusColor = (pct) => {
    if (pct <= 45) return 'text-red-600 bg-red-50 border-red-200';
    if (pct <= 75) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  return (
    <aside className="w-full lg:w-80 bg-white border-r border-slate-200 p-5 flex flex-col justify-between min-h-screen shadow-sm">
      <div className="space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
            <span>⚙️ Command Controls</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Filter urban wards & simulate resource scarcity
          </p>
        </div>

        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            📍 Jurisdiction Filter
          </div>

          <div>
            <label htmlFor="city-select" className="block text-sm font-medium text-slate-700 mb-1">
              City Corporation
            </label>
            <select
              id="city-select"
              value={selectedCity}
              onChange={handleCityChange}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Cities (60 Wards)</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city} ({CITY_WARDS_MAP[city].length} Wards)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ward-select" className="block text-sm font-medium text-slate-700 mb-1">
              Target Ward
            </label>
            <select
              id="ward-select"
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              disabled={selectedCity === 'ALL'}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 disabled:opacity-50"
            >
              <option value="ALL">
                {selectedCity === 'ALL' ? 'Select a city first...' : `All ${selectedCity} Wards`}
              </option>
              {availableWards.map((ward) => (
                <option key={ward} value={ward}>
                  {ward}
                </option>
              ))}
            </select>
          </div>
        </div>

        <hr className="border-slate-100" />

        <div className="space-y-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            ⚠️ Scarcity Parameters
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="stock-slider" className="text-sm font-medium text-slate-700">
                Available Regional Stock
              </label>
              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getStockStatusColor(stockPercentage)}`}>
                {stockPercentage}%
              </span>
            </div>
            <input
              id="stock-slider"
              type="range"
              min={30}
              max={100}
              step={5}
              value={stockPercentage}
              onChange={(e) => setStockPercentage(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>30% (Severe Shortage)</span>
              <span>100% (Full)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="crew-slider" className="text-sm font-medium text-slate-700">
                Total Spraying Crews
              </label>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                {totalCrews} Teams
              </span>
            </div>
            <input
              id="crew-slider"
              type="range"
              min={10}
              max={150}
              step={5}
              value={totalCrews}
              onChange={(e) => setTotalCrews(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>10 Teams</span>
              <span>150 Teams</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onResetDefaults}
            className="w-full py-2 px-3 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            ↺ Reset to Baseline (100% / 60 Teams)
          </button>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-slate-100">
        <div
          className={`p-3 rounded-lg border text-xs ${
            isOfflineMode
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <p className="font-semibold">
            {isOfflineMode ? '🔌 Offline Fallback Active' : '🟢 Local Engine Connected'}
          </p>
          <p className="text-[11px] opacity-80 mt-0.5">
            {isOfflineMode ? 'Running deterministic local models' : 'FastAPI + Serialized ML ready'}
          </p>
        </div>
      </div>
    </aside>
  );
};

export default SidebarControls;