import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DoctorDashboard from "./pages/DoctorDashboard";
import EncounterDetailPage from "./pages/EncounterDetailPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DoctorDashboard />} />
        <Route
          path="/doctor/consultations/:id"
          element={<EncounterDetailPage />}
        />
      </Routes>
    </Router>
  );
}

export default App;