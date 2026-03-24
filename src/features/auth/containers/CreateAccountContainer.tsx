import { CreateAccountCard } from "@/components";
import { useNavigate } from "react-router";
import { StyledLoginContainer } from "./LoginContainer";
import { tap } from "rxjs";
import { useAuthSlice } from "../authSlice";

const CreateAccountContainer = () => {
  const navigate = useNavigate();
  const { createAccount } = useAuthSlice();

  const doAccountCreation = (email: string, password: string) => {
    return createAccount(email, password).pipe(tap(() => navigate("/")));
  };

  return (
    <StyledLoginContainer>
      <CreateAccountCard createAccount={doAccountCreation} cancel={() => navigate("/login")} />
    </StyledLoginContainer>
  );
};

export default CreateAccountContainer;
