// This file stores and manages activity logs for the dashboard
const fs = require('fs').promises;
const path = require('path');

const ACTIVITY_FILE = path.resolve(__dirname, 'activity-log.json');

async function getActivities() {
  try {
    const data = await fs.readFile(ACTIVITY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function addActivity(activity) {
  const activities = await getActivities();
  activities.unshift(activity); // Add to the top
  await fs.writeFile(ACTIVITY_FILE, JSON.stringify(activities.slice(0, 50), null, 2)); // Keep last 50
}

module.exports = { getActivities, addActivity };
