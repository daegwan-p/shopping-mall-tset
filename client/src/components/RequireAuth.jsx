import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isTransientAuthPath } from "../utils/authRedirect";

function RequireAuth({ children }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    const from = location.pathname + location.search;
    return (
      <Navigate
        to="/login"
        replace
        state={isTransientAuthPath(from) ? undefined : { from }}
      />
    );
  }

  return children;
}

export default RequireAuth;
