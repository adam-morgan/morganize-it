import { useReactiveQuery } from "@/hooks/useReactiveQuery";
import { ReactNode } from "react";
import { useNavigate } from "react-router";
import { getUser } from "./auth-service";
import { useAuthSlice } from "./authSlice";

const WithAuth = ({ children }: { children: ReactNode }) => {
  const { user, setUser } = useAuthSlice();
  const navigate = useNavigate();

  useReactiveQuery(getUser, (user) => {
    setUser(user);

    if (!user) {
      return navigate("/login");
    }
  });

  if (!user) {
    return undefined;
  }

  return children;
};

export default WithAuth;
