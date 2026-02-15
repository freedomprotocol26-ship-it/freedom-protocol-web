const API_BASE = "http://localhost:4000";

export async function getDoctorDashboardSummary(token) {
  const response = await fetch(`${API_BASE}/doctor/dashboard/summary`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.json();
}

export async function getDoctorPatients(token) {
  const response = await fetch(`${API_BASE}/doctor/dashboard/patients`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.json();
}
