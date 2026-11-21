"use client";
import React, { useState, useEffect, useMemo } from "react";
import { fetchWardsData, fetchWardPrediction } from "../../lib/api";
import OverviewHeader from "./OverviewHeader";
import OverviewKpiGrid from "./OverviewKpiGrid";
import OverviewAnalytics from "./OverviewAnalytics";

const TIER_MAP = {
  Critical: { score: 88, badge: "bg-red-100 text-red-700 border-red-300" },
  High: { score: 74, badge: "bg-amber-100 text-amber-800 border-amber-300" },
  Medium: { score: 55, badge: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  Low: { score: 32, badge: "bg-emerald-100 text-emerald-700 border-emerald-300" },
};

const PALETTE = [
  { textColor: "text-red-600", barColor: "bg-red-600" },
  { textColor: "text-amber-600", barColor: "bg-amber-500" },
  { textColor: "text-blue-600", barColor: "bg-blue-500" },
  { textColor: "text-slate-600", barColor: "bg-slate-600" },
];

const normalizeCity = (c = "") => {
  const s = String(c).trim().toLowerCase();
  return s.includes("chittagong") || s.includes("chattogram") ? "chattogram" : s;
};

const getTier = (raw = "", cases = 0) => {
  const s = String(raw).toLowerCase();
  if (s.includes("crit")) return "Critical";
  if (s.includes("high")) return "High";
  if (s.includes("med") || s.includes("mod")) return "Medium";
  if (s.includes("low")) return "Low";
  if (cases >= 15) return "Critical";
  if (cases >= 9) return "High";
  if (cases >= 4) return "Medium";
  return "Low";
};

const Overview = ({ selectedCity }) => {
  const [wardsByCity, setWardsByCity] = useState({});
  const [selectedWardId, setSelectedWardId] = useState("");
  const [forecastWindow, setForecastWindow] = useState("2 Weeks");
  const [targetDate, setTargetDate] = useState("2025-08-18");
  const [prediction, setPrediction] = useState(null);
  const [apiError, setApiError] = useState("");
  const [wardsLoaded, setWardsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetchWardsData();
        const rawList = Array.isArray(res) ? res : res.wards || res.data || [];
        if (!active) return;

        // ব্যাকএন্ডের available_dates থেকে সক্রিয় আউটব্রেক তারিখ ("2025-08-18") বেছে নেওয়া
        const dates = res.available_dates || [];
        if (dates.length && !dates.includes("2025-08-18")) {
          setTargetDate(res.latest_date || dates[0]);
        }

        const grouped = {};
        rawList.forEach((w) => {
          const key = normalizeCity(w.city || w.city_name);
          const id = w.ward_id || w.id;
          if (key && id) {
            (grouped[key] ||= []).push({ id, name: w.ward_name || id, ...w });
          }
        });
        setWardsByCity(grouped);
        setApiError("");
      } catch (err) {
        if (active) setApiError(err.message || "Failed to connect to API");
      } finally {
        if (active) setWardsLoaded(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const currentWards = useMemo(
    () => wardsByCity[normalizeCity(selectedCity)] || [],
    [wardsByCity, selectedCity]
  );

  const activeWardId = currentWards.some((w) => w.id === selectedWardId)
    ? selectedWardId
    : currentWards[0]?.id || "";
  const baseWard = currentWards.find((w) => w.id === activeWardId) || currentWards[0] || null;

  // এখানে targetDate ("2025-08-18") সহ কল করায় আর 0 predicted cases আসবে না
  useEffect(() => {
    if (!baseWard?.id) return;
    let active = true;
    (async () => {
      try {
        const data = await fetchWardPrediction(baseWard.id, targetDate);
        if (active) { setPrediction(data); setApiError(""); }
      } catch (err) {
        if (active) { setPrediction(null); setApiError(err.message || "Prediction fetch failed"); }
      }
    })();
    return () => { active = false; };
  }, [baseWard?.id, targetDate]);

  const isLoading = !apiError && (!wardsLoaded || Boolean(baseWard?.id && prediction?.ward_id !== baseWard.id));
  const horizon = forecastWindow === "4 Weeks" ? 4 : forecastWindow === "3 Weeks" ? 3 : 2;
  const forecast = prediction?.forecasts?.find((f) => Number(f.horizon_weeks) === horizon);

  const predictedCases = forecast ? Math.round(Number(forecast.predicted_cases ?? 0)) : null;
  const riskTier = forecast ? getTier(forecast.risk_level, predictedCases) : "Low";
  const { score: riskScore, badge: riskBadgeStyle } = TIER_MAP[riskTier];

  const activeWard = useMemo(() => {
    const w = prediction?.weather || {};
    const loggingDriver = prediction?.drivers?.find((d) => d.factor?.includes("Water-Logging"));
    const vulnDriver = prediction?.drivers?.find((d) => d.factor?.includes("Vulnerability"));
    const vulnParts = String(vulnDriver?.value || "").match(/([\d,]+)\/sqkm\s*\|\s*Sanitation\s*([\d.]+)/i);

    const popVal = Number(baseWard?.population_density_sqkm ?? (vulnParts ? vulnParts[1].replace(/,/g, "") : 0));
    const sanVal = Number(baseWard?.sanitation_score ?? (vulnParts ? vulnParts[2] : 0.5));
    const logVal = Number(baseWard?.water_logging_risk_index ?? loggingDriver?.value ?? 0.5);
    const tempVal = Number(w.avg_temp_c ?? 0);

    const historicalPeak = Number(
      baseWard?.historical_peak_cases ??
      baseWard?.peak_weekly_cases ??
      baseWard?.peak_cases ??
      baseWard?.max_weekly_cases ??
      baseWard?.max_cases ??
      baseWard?.peakCases ??
      prediction?.historical_peak_cases ??
      prediction?.peak_cases ??
      prediction?.current_cases ??
      0
    );

    return {
      ...(baseWard || {}),
      id: baseWard?.id || activeWardId || "Loading...",
      name: baseWard?.name || activeWardId || "Loading Ward...",
      currentCases: Number(prediction?.current_cases ?? 0),
      predictedCases: predictedCases ?? 0,
      peakCases: historicalPeak,
      laggedRainfall: Number(w.rainfall_mm ?? w.rainfall_prev_4w_sum ?? 0),
      humidity: Number(w.relative_humidity_pct ?? 0),
      avgTemp: tempVal,
      temperature: tempVal,
      temp: tempVal,
      waterLogging: logVal,
      sanitation: sanVal,
      popDensity: popVal,
      populationDensity: popVal,
      dataDate: prediction?.data_date || targetDate,
    };
  }, [baseWard, activeWardId, prediction, predictedCases, targetDate]);

  const earlyWarningDays = forecastWindow === "4 Weeks" ? 26 : forecastWindow === "3 Weeks" ? 21 : 15;

  const drivers = useMemo(() => {
    if (Array.isArray(prediction?.drivers) && prediction.drivers.length) {
      return prediction.drivers.slice(0, 4).map((d, i) => ({
        label: d.factor || d.label || `Factor ${i + 1}`,
        code: d.value ? `${d.value} • Risk Index` : "Risk Severity Index",
        pct: Math.min(100, Math.max(0, Math.round(Number(d.score ?? 0)))),
        ...PALETTE[i % 4],
      }));
    }
    return [
      { label: "Multi-Week Rainfall", code: "Awaiting live telemetry", pct: 0, ...PALETTE[0] },
      { label: "Water-Logging Risk", code: "Awaiting live telemetry", pct: 0, ...PALETTE[1] },
      { label: "Average Temperature", code: "Awaiting live telemetry", pct: 0, ...PALETTE[2] },
      { label: "Relative Humidity", code: "Awaiting live telemetry", pct: 0, ...PALETTE[3] },
    ];
  }, [prediction]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${apiError ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
          <span className="font-semibold text-slate-700">
            {apiError
              ? `API Disconnected: ${apiError}`
              : `Live ML API Connected • ${selectedCity} (${currentWards.length} wards) • Date: ${prediction?.data_date || targetDate}`}
          </span>
        </div>

        {isLoading ? (
          <span className="text-red-600 font-semibold animate-pulse">Fetching live ML predictions...</span>
        ) : forecast && !apiError ? (
          <span className="font-bold text-slate-800">
            {forecastWindow} Forecast:{" "}
            <span className="text-red-600">
              {predictedCases} predicted cases ({riskTier} Risk)
            </span>
          </span>
        ) : (
          <span className="text-amber-700 font-semibold">
            Model prediction unavailable for selected horizon
          </span>
        )}
      </div>

      <OverviewHeader
        selectedCity={selectedCity}
        currentWards={currentWards}
        activeWard={activeWard}
        setSelectedWardId={setSelectedWardId}
        forecastWindow={forecastWindow}
        setForecastWindow={setForecastWindow}
      />

      <OverviewKpiGrid
        riskScore={riskScore}
        riskTier={riskTier}
        riskBadgeStyle={riskBadgeStyle}
        forecastWindow={forecastWindow}
        activeWard={activeWard}
        earlyWarningDays={earlyWarningDays}
        predictedCases={predictedCases}
        isLiveApi={!apiError && Boolean(forecast)}
      />

      <OverviewAnalytics activeWard={activeWard} drivers={drivers} />
    </div>
  );
};

export default Overview;