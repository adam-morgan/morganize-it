import { BrandLogo, CreateAccountCard } from "@/components";
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
      <BrandLogo size="lg" layout="column" className="mb-8" />
      <CreateAccountCard createAccount={doAccountCreation} cancel={() => navigate("/login")} />
    </StyledLoginContainer>
  );
};

export default CreateAccountContainer;
