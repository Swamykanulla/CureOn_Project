import { createContext, useContext, useState, useEffect } from "react";
import { authService } from "@/services/api";
import { jwtDecode } from "jwt-decode";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on mount
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // We can either set user from decoded token (if it has role) or fetch from API
        // Fetching from API ensures we have the latest data
        authService.getCurrentUser()
          .then(userData => {
            setUser(userData);
          })
          .catch(() => {
            // If fetch fails, maybe token is invalid
            authService.logout();
            setUser(null);
          })
          .finally(() => setLoading(false));
      } catch (e) {
        authService.logout();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const data = await authService.login(username, password);
      // After login, get user details to know the role
      const userData = await authService.getCurrentUser();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      await authService.register(userData);
      // Auto login after register? Or redirect to login?
      // Let's assume we redirect to login, so no user setting here
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      return userData;
    } catch (e) {
      console.error("Failed to refresh user", e);
      throw e;
    }
  };

  return (
    <UserContext.Provider value={{ user, login, register, logout, loading, refreshUser }}>
      {!loading && children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
