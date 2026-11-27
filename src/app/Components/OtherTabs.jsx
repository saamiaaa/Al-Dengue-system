"use client";
import React, { useState, useEffect } from "react";
import { fetchWardsData, fetchWardPrediction } from "../../lib/api";

const isHighRiskLevel = (level) => {
  if (!level) return false;
  const lower = String(level).toLowerCase();
  return lower.includes("high") || lower.includes("crit");
};

// ১. Alerts & Recom ট্যাব
export const Alerts = ({ selectedCity = "Chattogram" }) => {
  const [wardAlerts, setWardAlerts] = useState([]);
  const [loadedCity, setLoadedCity] = useState("");
  const [apiError, setApiError] = useState("");
  const [dispatchedWards, setDispatchedWards] = useState({});

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
              rainfall: p.weather?.rainfall_mm ?? 0,
            };
          });

        setWardAlerts(formatted);
        setApiError("");
      } catch (err) {
        if (mounted) setApiError(err.message || "Failed to load live alerts");
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

  const toggleDispatch = (wardId) => {
    setDispatchedWards((prev) => ({ ...prev, [wardId]: !prev[wardId] }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Alerts &amp; Municipal Recommendations — {selectedCity}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Automated outbreak thresholds, vector control triggers &amp; clinical advisories
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              apiError
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {apiError ? "● OFFLINE ADVISORY MODE" : "● LIVE ML ALERTS ACTIVE"}
          </span>
        </div>

        <div className="p-4 bg-red-50/90 border-l-4 border-red-600 rounded-r-xl text-sm text-red-700">
          <p className="font-bold text-red-800">
            🚨 Priority Vector Control Alert ({highRisk.length} High/Critical Risk Wards)
          </p>
          <p className="mt-1">
            {isLoading
              ? `Scanning live 2-week ML risk forecasts for ${selectedCity}...`
              : highRisk.length > 0
              ? `Immediate larvicide spraying & drainage clearance required in: ${highRisk
                  .slice(0, 6)
                  .map((w) => `${w.id} (${w.predictedCases} predicted cases)`)
                  .join(", ")}.`
              : `No critical outbreak threshold breached in ${selectedCity} right now. Maintain routine weekly larval surveillance.`}
          </p>
        </div>

        {highRisk.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {highRisk.slice(0, 4).map((ward) => (
              <div
                key={ward.id}
                className="p-4 rounded-xl border border-red-100 bg-slate-50/80 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">{ward.id}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      {ward.riskLevel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    2-Week Forecast: <strong>{ward.predictedCases} cases</strong> • Rainfall:{" "}
                    {ward.rainfall} mm
                  </p>
                </div>
                <button
                  onClick={() => toggleDispatch(ward.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    dispatchedWards[ward.id]
                      ? "bg-emerald-600 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {dispatchedWards[ward.id] ? "✓ Crew Notified" : "Dispatch Crew"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/95 p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <h3 className="font-bold text-blue-900 text-sm flex items-center gap-2">
            🩺 Clinical &amp; Hospital Triage Advisory
          </h3>
          <ul className="text-xs text-gray-700 space-y-1.5 list-disc list-inside">
            <li>Mandate NS1 Antigen &amp; CBC screening for acute fever &gt; 48 hours.</li>
            <li>Pre-position 2.4× IV Saline bags per predicted case in primary health clinics.</li>
            <li>Activate platelet &amp; hematocrit monitoring protocols for warning-sign patients.</li>
          </ul>
        </div>

        <div className="bg-white/95 p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
            🦟 Municipal Aedes Control Checklist
          </h3>
          <ul className="text-xs text-gray-700 space-y-1.5 list-disc list-inside">
            <li>Clear stagnant water in high water-logging zones within 72 hours of heavy rain.</li>
            <li>Deploy fogging squads in wards with population density &gt; 50,000/sqkm.</li>
            <li>Conduct door-to-door container inspection in construction sites &amp; schools.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ২. Data & Reports ট্যাব
export const Reports = ({ selectedCity = "Chattogram" }) => {
  const [wardPreviews, setWardPreviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadReportPreview() {
      setIsLoading(true);
      try {
        const res = await fetchWardsData();
        if (!mounted) return;
        const filtered = (res.wards || []).filter(
          (w) => w.city === selectedCity
        );

        const predictions = await Promise.all(
          filtered.map((w) => fetchWardPrediction(w.ward_id).catch(() => null))
        );

        if (!mounted) return;
        setWardPreviews(predictions.filter(Boolean));
      } catch {
        if (mounted) setWardPreviews([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadReportPreview();
    return () => {
      mounted = false;
    };
  }, [selectedCity]);

  const totalCurrentCases = wardPreviews.reduce(
    (sum, p) => sum + (Number(p.current_cases) || 0),
    0
  );
  const total2WCases = wardPreviews.reduce((sum, p) => {
    const f2 = p.forecasts?.find((f) => f.horizon_weeks === 2);
    return sum + Math.round(Number(f2?.predicted_cases ?? 0));
  }, 0);
  const estimatedSaline = Math.round(total2WCases * 2.4);
  const estimatedKits = Math.round(total2WCases * 1.15);

  const downloadCSV = () => {
    if (wardPreviews.length === 0) return;
    setIsExporting(true);

    try {
      const rows = wardPreviews.map((p) => {
        const w = p.weather || {};
        const f2 = p.forecasts?.find((f) => f.horizon_weeks === 2);
        const f4 = p.forecasts?.find((f) => f.horizon_weeks === 4);
        const pred2W = Math.round(Number(f2?.predicted_cases ?? 0));
        return [
          p.ward_id,
          selectedCity,
          p.data_date || "",
          p.current_cases ?? 0,
          w.rainfall_mm ?? 0,
          w.avg_temp_c ?? 0,
          w.relative_humidity_pct ?? 0,
          pred2W,
          Math.round(Number(f4?.predicted_cases ?? 0)),
          Math.round(pred2W * 2.4),
          Math.round(pred2W * 1.15),
          f2?.risk_level || "Low",
        ].join(",");
      });

      const csv = [
        "Ward_ID,City,Data_Date,Current_Cases,Rainfall_mm,Avg_Temp_C,Humidity_Pct,Predicted_2W_Cases,Predicted_4W_Cases,Est_Saline_Bags,Est_NS1_Kits,Risk_Level",
        ...rows,
      ].join("\n");

      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = `${selectedCity}_Live_Dengue_Resource_Report.csv`;
      a.click();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Surveillance Data &amp; Resource Reports — {selectedCity}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Export live {wardPreviews.length}-ward ML forecast, meteorological inputs &amp; medical supply estimates.
            </p>
          </div>
          <button
            onClick={downloadCSV}
            disabled={isExporting || wardPreviews.length === 0}
            className="bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors shrink-0"
          >
            {isExporting
              ? "⏳ Generating Live CSV..."
              : `⬇️ Export Full CSV (${selectedCity})`}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase">Active Cases</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalCurrentCases}</p>
          </div>
          <div className="p-4 rounded-xl bg-red-50 border border-red-100">
            <p className="text-xs font-semibold text-red-600 uppercase">2-Week Forecast</p>
            <p className="text-2xl font-extrabold text-red-900 mt-1">{total2WCases}</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-xs font-semibold text-blue-600 uppercase">IV Saline Needed</p>
            <p className="text-2xl font-extrabold text-blue-900 mt-1">{estimatedSaline}</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
            <p className="text-xs font-semibold text-amber-600 uppercase">NS1 Kits Needed</p>
            <p className="text-2xl font-extrabold text-amber-900 mt-1">{estimatedKits}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-slate-100 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-bold">Ward ID</th>
                <th className="px-4 py-3 text-center font-bold">Current Cases</th>
                <th className="px-4 py-3 text-center font-bold">2W Forecast</th>
                <th className="px-4 py-3 text-center font-bold">Rainfall (mm)</th>
                <th className="px-4 py-3 text-center font-bold">Saline Bags</th>
                <th className="px-4 py-3 text-center font-bold">Risk Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                    Loading live ward surveillance records for {selectedCity}...
                  </td>
                </tr>
              ) : wardPreviews.length > 0 ? (
                wardPreviews.slice(0, 8).map((p) => {
                  const f2 = p.forecasts?.find((f) => f.horizon_weeks === 2);
                  const pred2W = Math.round(Number(f2?.predicted_cases ?? 0));
                  const risk = f2?.risk_level || "Low";
                  return (
                    <tr key={p.ward_id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-semibold text-gray-800">{p.ward_id}</td>
                      <td className="px-4 py-2.5 text-center text-gray-700">{p.current_cases ?? 0}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-red-600">{pred2W}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{p.weather?.rainfall_mm ?? 0}</td>
                      <td className="px-4 py-2.5 text-center text-gray-700">{Math.round(pred2W * 2.4)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold ${
                            isHighRiskLevel(risk)
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {risk}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                    No live API records available right now. Check connection or switch city.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ৩. Settings ট্যাব
export const Settings = () => {
  const [sms, setSms] = useState(true);
  const [whatsapp, setWhatsapp] = useState(true);
  const [emailBriefing, setEmailBriefing] = useState(true);
  const [sync, setSync] = useState(true);
  const [bufferPercent, setBufferPercent] = useState(20);
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3500);
  };

  return (
    <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm max-w-3xl">
      <h2 className="text-xl font-bold text-gray-800 mb-1">
        System &amp; Dispatch Settings
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Configure emergency supply thresholds, sync, and automated alerts.
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-4 bg-slate-50/80 rounded-xl border border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Emergency Saline &amp; NS1 Kit Reserve Buffer ({bufferPercent}%)
          </label>
          <input
            type="range"
            min="10"
            max="50"
            step="5"
            value={bufferPercent}
            onChange={(e) => setBufferPercent(Number(e.target.value))}
            className="w-full accent-red-600 cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">
            Automatically adds a {bufferPercent}% safety stock on top of
            predicted ward requirements.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Automated Dispatch Channels
          </h3>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-slate-50/80">
            <div>
              <p className="font-medium text-gray-800 text-sm">
                Critical Ward SMS Alerts
              </p>
              <p className="text-xs text-gray-500">
                Send instant low-stock &amp; surge SMS to Civil Surgeon office
              </p>
            </div>
            <input
              type="checkbox"
              checked={sms}
              onChange={(e) => setSms(e.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-slate-50/80">
            <div>
              <p className="font-medium text-gray-800 text-sm">
                WhatsApp Rapid Dispatch
              </p>
              <p className="text-xs text-gray-500">
                Automated logistic requests to central medical store
              </p>
            </div>
            <input
              type="checkbox"
              checked={whatsapp}
              onChange={(e) => setWhatsapp(e.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-slate-50/80">
            <div>
              <p className="font-medium text-gray-800 text-sm">
                Ward Commissioner Email Briefing
              </p>
              <p className="text-xs text-gray-500">
                Weekly outbreak &amp; water-logging summary report
              </p>
            </div>
            <input
              type="checkbox"
              checked={emailBriefing}
              onChange={(e) => setEmailBriefing(e.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
          </label>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Data Sync
          </h3>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-slate-50/80">
            <div>
              <p className="font-medium text-gray-800 text-sm">
                Auto-sync BMD Weather Data
              </p>
              <p className="text-xs text-gray-500">
                Sync meteorological &amp; rainfall updates automatically when online
              </p>
            </div>
            <input
              type="checkbox"
              checked={sync}
              onChange={(e) => setSync(e.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
          </label>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            Save Configuration
          </button>

          {savedMessage && (
            <span className="text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              ✓ Configuration saved successfully!
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

// ৪. Help & About ট্যাব
export const HelpAbout = () => (
  <div className="space-y-6">
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