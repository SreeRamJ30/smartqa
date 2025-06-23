// This file provides a mock API for recent activity. Replace with real API endpoint as needed.
export async function fetchRecentActivity() {
  const res = await fetch('http://localhost:3001/api/activity');
  if (!res.ok) throw new Error('Failed to fetch activity');
  return await res.json();
}
