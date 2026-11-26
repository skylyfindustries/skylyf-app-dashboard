import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { User, UserRole } from "@/types/crm";
import { authAPI, setToken, removeToken, getToken, ssoFromSkylyf } from "@/services/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapUser(data: any): User {
  return {
    id: data._id || data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    avatar: data.avatar,
    phone: data.phone,
    department: data.department,
    status: data.status,
    lastLogin: data.lastLogin,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      // signed in to the Skylyf dashboard? then no second login
      const sso = await ssoFromSkylyf();
      if (sso) {
        const { token, ...u } = sso;
        setToken(token);
        const mapped = mapUser(u);
        localStorage.setItem("user", JSON.stringify(mapped));
        setUser(mapped);
        setIsLoading(false);
        return;
      }
      const token = getToken();
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        try {
          const initialUser = JSON.parse(storedUser);
          setUser(initialUser);
          setIsLoading(false);

          const response = await authAPI.getMe();
          const userData = mapUser(response.data);
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
        } catch (error: any) {
          if (error.status === 401) {
            removeToken();
            localStorage.removeItem("user");
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    };

    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      const { token, ...userData } = response.data;

      setToken(token);
      const mappedUser = mapUser(userData);
      localStorage.setItem("user", JSON.stringify(mappedUser));
      setUser(mappedUser);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Login failed. Please try again.",
      };
    }
  }, []);

  const logout = useCallback(() => {
    removeToken();
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const updateUser = useCallback((userData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...userData };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be within AuthProvider");
  return ctx;
}
