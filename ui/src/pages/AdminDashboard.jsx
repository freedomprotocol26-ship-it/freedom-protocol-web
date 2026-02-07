export default function AdminDashboard({ user, onLogout }) {
  return (
    <div style={{ padding: 40 }}>
      <h2>Admin Dashboard</h2>
      <p>Welcome, {user?.email || "admin"}.</p>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}
