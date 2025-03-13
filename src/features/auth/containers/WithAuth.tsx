import { useReactiveQuery } from "@/hooks/useReactiveQuery";
import { ReactNode } from "react";
import { useNavigate } from "react-router";
import { getAuthService } from "../services/auth-service";
import { useAuthSlice } from "../authSlice";
import { useEffectOnMount } from "@/hooks/useEffectOnMount";

const WithAuth = ({ children }: { children: ReactNode }) => {
  const { user, setUser } = useAuthSlice();
  const reactiveQuery = useReactiveQuery();
  const navigate = useNavigate();

  useEffectOnMount(() =>
    reactiveQuery<User | undefined>(
      () => getAuthService().getUser(),
      (user) => {
        setUser(user);

        if (!user) {
          return navigate("/login");
        }
      }
    )
  );

  if (!user) {
    return undefined;
  }

  return children;
};

export default WithAuth;
