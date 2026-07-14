import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function useAuth(){
  return useContext(AuthContext)
}

export function AuthProvider({children}){
  const [user, setUser] =useState(null);
  const [token, setToken] = useState(null);

  const login =(userData, jwt)=>{
    setUser(userData);
    setToken(jwt);

    localStorage.setItem("user-token", jwt);
    localStorage.setItem("user", JSON.stringify(userData))
  }

  const logout = ()=>{
    setUser(null);
    setToken(null);

    localStorage.removeItem("user-token");
    localStorage.removeItem("user")
  }

  return(
    <AuthContext.Provider value={{user, token, login, logout}}>
      {children}
    </AuthContext.Provider>
  )
}