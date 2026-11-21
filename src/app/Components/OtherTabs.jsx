"use client";
import React, { useState, useEffect } from "react";
import { fetchWardsData, fetchWardPrediction } from "../../lib/api";

const isHighRiskLevel = (level) => {
  if (!level) return false;
  const lower = String(level).toLowerCase();
  return lower.includes("high") || lower.includes("crit");
};

export const Alerts = ({ selectedCity }) => {
  const [wardAlerts, setWardAlerts] = useState([]);
  const [loadedCity, setLoadedCity] = useState("");
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCityAlerts() {
      try {
        const wardsRes = await fetchWardsData();
        if (!mounted) return;

        const cityWards = (wardsRes.wards || []).filter(
          (w) => w.city === selectedCity
        );

        const predictions = await Promise.all(
          cityWards.map((w) =>
            fetchWardPrediction(w.ward_id).catch(() => null)
          )
        );

        if (!mounted) return;

        const formatted = predictions
          .filter(Boolean)
          .map((p) => {
            const twoWeek = p.forecasts?.find((f) => f.horizon_weeks === 2);
            return {
              id: p.ward_id,
              predictedCases: Math.round(Number(twoWeek?.predicted_cases ?? 0)),
              riskLevel: twoWeek?.risk_level || "Low",
            };
          });

        setWardAlerts(formatted);
        setApiError("");
      } catch (err) {
        if (mounted) setApiError(err.message || "Failed to load alerts");
      } finally {
        if (mounted) setLoadedCity(selectedCity);
      }
    }

    loadCityAlerts();
    return () => {
      mounted = false;
    };
  }, [selectedCity]);

  const isLoading = !apiError && loadedCity !== selectedCity;
  const highRisk = wardAlerts.filter((w) => isHighRiskLevel(w.riskLevel));

  return (
    <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-gray-800">
          Alerts &amp; Recommendations — {selectedCity}
        </h2>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
            apiError
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {apiError ? "API OFFLINE" : "LIVE ML ALERTS"}
        </span>
      </div>

      <div className="p-4 bg-red-50/90 border-l-4 border-red-600 rounded-r-xl text-sm text-red-700">
        <p className="font-bold text-red-800">
          🚨 Priority Alert ({highRisk.length} High/Critical Risk Wards)
        </p>
        <p className="mt-1">
          {isLoading
            ? `Scanning live ML risk forecasts for ${selectedCity}...`
            : highRisk.length
            ? `Deploy larvicide & drainage clearance in: ${highRisk
                .slice(0, 5)
                .map((w) => `${w.id} (${w.predictedCases} cases, ${w.riskLevel})`)
                .join(", ")}.`
            : `No critical threshold breached in ${selectedCity}. Continue routine checks.`}
        </p>
      </div>

      <div className="p-4 bg-blue-50/90 border-l-4 border-blue-600 rounded-r-xl text-sm text-blue-700">
        <p className="font-bold text-blue-800">🩺 Clinical Advisory</p>
        <p className="mt-1">
          Advise NS1 Antigen &amp; CBC testing for fever cases lasting &gt; 48
          hours.
        </p>
      </div>
    </div>
  );
};

export const Reports = ({ selectedCity }) => {
  const [cityWardIds, setCityWardIds] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadWardsList() {
      try {
        const res = await fetchWardsData();
        if (!mounted) return;
        const filtered = (res.wards || []).filter(
          (w) => w.city === selectedCity
        );
        setCityWardIds(filtered.map((w) => w.ward_id));
      } catch (_) {
        if (mounted) setCityWardIds([]);
      }
    }

    loadWardsList();
    return () => {
      mounted = false;
    };
  }, [selectedCity]);

  const downloadCSV = async () => {
    if (cityWardIds.length === 0) return;
    setIsExporting(true);

    try {
      const predictions = await Promise.all(
        cityWardIds.map((id) => fetchWardPrediction(id).catch(() => null))
      );

      const rows = predictions.filter(Boolean).map((p) => {
        const w = p.weather || {};
        const f2 = p.forecasts?.find((f) => f.horizon_weeks === 2);
        const f4 = p.forecasts?.find((f) => f.horizon_weeks === 4);
        return [
          p.ward_id,
          selectedCity,
          p.data_date || "",
          p.current_cases ?? 0,
          w.rainfall_mm ?? 0,
          w.avg_temp_c ?? 0,
          w.relative_humidity_pct ?? 0,
          Math.round(Number(f2?.predicted_cases ?? 0)),
          Math.round(Number(f4?.predicted_cases ?? 0)),
          f2?.risk_level || "Low",
        ].join(",");
      });

      const csv = [
        "Ward_ID,City,Data_Date,Current_Cases,Rainfall_mm,Avg_Temp_C,Humidity_Pct,Predicted_2W_Cases,Predicted_4W_Cases,Risk_Level",
        ...rows,
      ].join("\n");

      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = `${selectedCity}_Live_Dengue_Report.csv`;
      a.click();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <h2 className="text-xl font-bold text-gray-800">
        Data &amp; Reports — {selectedCity}
      </h2>
      <p className="text-sm text-gray-600">
        Export live {cityWardIds.length}-ward ML forecast &amp; vector
        surveillance dataset directly from the API.
      </p>
      <button
        onClick={downloadCSV}
        disabled={isExporting || cityWardIds.length === 0}
        className="bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
      >
        {isExporting
          ? "⏳ Generating Live CSV..."
          : `⬇️ Download Live CSV (${selectedCity})`}
      </button>
    </div>
  );
};

export const Settings = () => {
  const [sms, setSms] = useState(true);
  const [sync, setSync] = useState(true);

  return (
    <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm max-w-md space-y-3 text-sm text-gray-700">
      <h2 className="text-xl font-bold text-gray-800">System Settings</h2>
      <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80">
        <span>Critical Ward SMS Alerts</span>
        <input
          type="checkbox"
          checked={sms}
          onChange={(e) => setSms(e.target.checked)}
          className="accent-red-600"
        />
      </label>
      <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80">
        <span>Auto-sync BMD Weather Data</span>
        <input
          type="checkbox"
          checked={sync}
          onChange={(e) => setSync(e.target.checked)}
          className="accent-red-600"
        />
      </label>
    </div>
  );
};

export const HelpAbout = () => (
  <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm max-w-xl space-y-2 text-sm text-gray-600">
    <h2 className="text-xl font-bold text-gray-800">
      About AI Dengue Surveillance
    </h2>
    <p>
      Predicts ward-level dengue outbreaks 2–4 weeks ahead using 31,320
      historical records across 60 wards via live ML inference API.
    </p>
  </div>
);