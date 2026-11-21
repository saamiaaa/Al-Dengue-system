const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function checkApiHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  return res.json();
}

export async function fetchWardsData() {
  const res = await fetch(`${BASE_URL}/api/wards`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to load wards");
  }
  return data;
}

export async function fetchWardPrediction(wardId, date = "") {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await fetch(`${BASE_URL}/api/predict/${wardId}${query}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to fetch ward prediction");
  }
  return data;
}

export async function fetchCustomPrediction(horizon, features) {
  const res = await fetch(`${BASE_URL}/api/predict/${horizon}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(features),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Custom prediction failed");
  }
  return data;
}