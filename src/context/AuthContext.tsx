import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import Cookies from "js-cookie";

// Define the shape of the AuthContext
interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: any;
  setAuth: (authState: boolean, user?: any) => void;
  getCurrentUser: () => any;
  getAuth: () => boolean;
  signOut: () => void;
}

// Create a context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export type UserProfileType = {
  firstName: string;
  lastName: string;
  avatar: string;
};

export type UserType = {
  profileSetupCompleted: boolean;
  userVerified: boolean;
  profile: UserProfileType | null;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Function to set auth state and current user
  const setAuth = (authState: boolean, user: UserType | null): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem("currentUser", JSON.stringify(user));
      Cookies.set("isAuthenticated", authState.toString(), { expires: 1 / 24 });
    }
    setIsAuthenticated(authState);
    setCurrentUser(user);
  };

  const getCurrentUser = (): any => currentUser;

  const getAuth = (): boolean => isAuthenticated;

  const signOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("currentUser");
      Cookies.remove("accessToken");
      Cookies.remove("isAuthenticated");
    }
    setAuth(false, null);
    console.log("logout successful");
  };

  // useEffect(() => {
  //   const authData = Cookies.get("isAuthenticated");
  //   const currentUserData = localStorage.getItem("currentUser");

  //   if (authData && currentUserData) {
  //     setCurrentUser(JSON.parse(currentUserData));
  //     authData && authData === "true"
  //       ? setIsAuthenticated(true)
  //       : setIsAuthenticated(false);
  //   } else {
  //     setCurrentUser(null);
  //     setIsAuthenticated(false);
  //   }
  // }, [isAuthenticated, currentUser]);

  useEffect(() => {
    const authData = Cookies.get("isAuthenticated");
    const currentUserData = localStorage.getItem("currentUser");

    if (authData && currentUserData) {
      setCurrentUser(JSON.parse(currentUserData));
      setIsAuthenticated(authData === "true");
    } else {
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        setAuth,
        getCurrentUser,
        getAuth,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
