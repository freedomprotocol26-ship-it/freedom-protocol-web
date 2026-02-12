import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isTokenExpired, getTokenRole } from "../utils/jwt";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * Secure initialization
   * - Load token from storage
   * - Validate expiry
   * - Extract role only from valid token
   */
  useEffect(() => {
    const savedToken = localStorage.getItem("token");

    if (savedToken && !isTokenExpired(savedToken)) {
      setToken(savedToken);
      setRole(getTokenRole(savedToken));
    } else {
      localStorage.removeItem("token");
    }

    setLoading(false);
  }, []);

  /**
   * Enforce expiry whenever token changes
   */
  useEffect(() => {
    if (token && isTokenExpired(token)) {
      logout();
    }
  }, [token]);

  const login = (newToken) => {
    if (!newToken || isTokenExpired(newToken)) {
      return;
    }

    localStorage.setItem("token", newToken);
    setToken(newToken);
    setRole(getTokenRole(newToken));
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setRole(null);
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        isAuthenticated: !!token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
