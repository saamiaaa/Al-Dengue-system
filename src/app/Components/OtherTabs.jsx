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
      } catch {
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
  <div className="space-y-6">
    {/* Hero Banner */}
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="px-3 py-1 rounded-full bg-red-600/90 text-xs font-bold uppercase tracking-wider">
          Urban Outbreak Command &amp; Decision Engine
        </span>
        <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-3 py-1 rounded-full">
          ● Zero-Downtime Offline Fallback Ready
        </span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-extrabold mt-3">
        AI Dengue Outbreak &amp; Resource Dispatch System
      </h2>
      <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
        Unlike passive surveillance dashboards that only plot past cases, our
        platform closes the loop between <strong>2–4 week hyper-local ML forecasting</strong> and{" "}
        <strong>constrained municipal resource optimization</strong> across 60
        wards in 5 major Bangladesh city corporations (31,320 weekly records).
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
          <p className="text-xs text-slate-300 uppercase">Coverage</p>
          <p className="text-xl font-extrabold text-white mt-0.5">60 Wards</p>
          <p className="text-[11px] text-slate-400">5 City Corporations</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
          <p className="text-xs text-slate-300 uppercase">Model Accuracy</p>
          <p className="text-xl font-extrabold text-emerald-400 mt-0.5">R² 0.89</p>
          <p className="text-[11px] text-slate-400">23 Lagged Features</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
          <p className="text-xs text-slate-300 uppercase">Failover Speed</p>
          <p className="text-xl font-extrabold text-amber-400 mt-0.5">&lt; 1.5 sec</p>
          <p className="text-[11px] text-slate-400">AbortController Switch</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
          <p className="text-xs text-slate-300 uppercase">Dispatch Output</p>
          <p className="text-xl font-extrabold text-sky-400 mt-0.5">SMS + PDF</p>
          <p className="text-[11px] text-slate-400">1-Click Field Action</p>
        </div>
      </div>
    </div>

    {/* What Makes Our Platform Different */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          ⚡ 4 Differentiating Capabilities
        </h3>
        <ul className="space-y-2.5 text-sm text-gray-700">
          <li className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <strong className="text-red-700">1. Scarcity-Aware Rationing Engine:</strong>{" "}
            Simulates real-world supply shocks (30%–100% stock) and prioritizes
            wards by a composite risk-vulnerability index instead of equal
            splitting.
          </li>
          <li className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <strong className="text-amber-700">2. Intra-City Hospital Surge Router:</strong>{" "}
            Detects ward bed saturation and automatically routes overflow
            patients to surplus hospitals within the same city boundary.
          </li>
          <li className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <strong className="text-emerald-700">3. Vector Control ROI Simulator:</strong>{" "}
            Models diminishing-returns case reduction weighted by each ward&apos;s
            water-logging index to rank highest-impact crew deployments.
          </li>
          <li className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <strong className="text-blue-700">4. Offline Kill-Switch Architecture:</strong>{" "}
            Built-in deterministic local engine guarantees uninterrupted
            live operations even if backend servers or internet drop.
          </li>
        </ul>
      </div>

      {/* Mathematical & Operational Logic */}
      <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          🧮 Clinical &amp; Optimization Formulas
        </h3>
        <div className="space-y-2.5 text-xs text-gray-700">
          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100">
            <p className="font-bold text-blue-900 uppercase">
              Baseline Medical Demand Multipliers
            </p>
            <p className="mt-1 font-mono text-blue-800">
              IV Saline = Cases × 2.4 | NS1 Kits = Cases × 1.15 | Beds = Cases × 0.65
            </p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-100">
            <p className="font-bold text-amber-900 uppercase">
              Ward Priority Weighting Index
            </p>
            <p className="mt-1 font-mono text-amber-800">
              Priority = Predicted_Cases × (Pop_Density / 50k) × (1 + Water_Logging)
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100">
            <p className="font-bold text-emerald-900 uppercase">
              Vector Intervention Impact Curve
            </p>
            <p className="mt-1 font-mono text-emerald-800">
              Reduction % = Max_Eff × (1 - e^(-0.42 × Crews)) × Water_Logging_Factor
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">
            🎯 Quick Live Verification Guide
          </h4>
          <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1">
            <li>
              Lower <strong>Available Regional Stock</strong> to <strong>60%</strong> to inspect unmet supply deficits.
            </li>
            <li>
              Check <strong>Intra-City Hospital Overflow</strong> cards for automated cross-ward patient routing.
            </li>
            <li>
              Click <strong>Dispatch</strong> on any critical ward to copy an SMS alert or export a PDF brief.
            </li>
          </ol>
        </div>
      </div>
    </div>

    {/* Architecture & AI Disclosure Footer */}
    <div className="bg-white/95 p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-gray-600">
      <div>
        <p className="font-bold text-gray-800">
          Tech Stack &amp; AI Disclosure
        </p>
        <p className="mt-0.5">
          Frontend: Next.js (App Router) &amp; Tailwind CSS • Inference API: Python FastAPI &amp; XGBoost • AI Assistance: Google Gemini used for UI architecture &amp; deterministic fallback modeling.
        </p>
      </div>
      <span className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-100 font-mono font-semibold text-slate-700">
        Build: v2.0-onsite-final
      </span>
    </div>
  </div>
);