import { CreateAccountCard } from "@/components";
import { useNavigate } from "react-router";
import { getAuthService } from "../services/auth-service";
import { StyledLoginContainer } from "./LoginContainer";
import { tap } from "rxjs";

const CreateAccountContainer = () => {
  const navigate = useNavigate();

  const doAccountCreation = (email: string, password: string) => {
    return getAuthService()
      .createAccount(email, password)
      .pipe(tap(() => navigate("/")));
  };

  return (
    <StyledLoginContainer>
      <CreateAccountCard createAccount={doAccountCreation} cancel={() => navigate("/login")} />
    </StyledLoginContainer>
  );
};

export default CreateAccountContainer;
