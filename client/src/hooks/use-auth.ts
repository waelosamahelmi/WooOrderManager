import { useState, useEffect } from "react";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in - persist forever unless manually logged out
    const authToken = localStorage.getItem('authToken');
    const loginTime = localStorage.getItem('loginTime');
    
    if (authToken && !loginTime) {
      // Set login time for existing sessions
      localStorage.setItem('loginTime', Date.now().toString());
    }
    
    setIsAuthenticated(!!authToken);
    setIsLoading(false);
  }, []);

  const login = () => {
    localStorage.setItem('authToken', 'authenticated');
    localStorage.setItem('loginTime', Date.now().toString());
    localStorage.setItem('userEmail', 'wael@helmies.fi');
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('userEmail');
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
}