// src/api/dashboard.js
import { request } from "./client";

export const dashboardApi = {
  stats: () => request("/dashboard/stats"),
};
