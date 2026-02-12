import { useAuth } from "../auth/AuthContext.jsx";

export default function AdminDashboard() {
  const { role, logout } = useAuth();

  return (
    <div style={{ padding: 40 }}>
      <h2>Admin Dashboard</h2>
      <p>Role: {role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
