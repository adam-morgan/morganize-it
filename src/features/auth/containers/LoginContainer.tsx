import { BrandLogo, LoginCard } from "@/components";
import { useNavigate } from "react-router";
import { take, tap } from "rxjs";
import { useAuthSlice } from "../authSlice";

export const StyledLoginContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="relative flex min-h-dvh flex-col items-center justify-center bg-background p-4 sm:p-8 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(ellipse_at_50%_50%,hsl(210_100%_97%),hsl(210_20%_98%))] before:bg-no-repeat dark:before:bg-[radial-gradient(at_50%_50%,hsl(217_50%_18%),hsl(224_20%_10%))]">
    {children}
  </div>
);

const LoginContainer = () => {
  const navigate = useNavigate();
  const { login, googleLogin, continueAsGuest } = useAuthSlice();

  const _login = (email: string, password: string) => {
    return login(email, password).pipe(tap(() => navigate("/")));
  };

  const _googleLogin = (credential: string) => {
    return googleLogin(credential).pipe(tap(() => navigate("/")));
  };

  const _continueAsGuest = () => {
    continueAsGuest()
      .pipe(take(1))
      .subscribe(() => navigate("/"));
  };

  return (
    <StyledLoginContainer>
      <BrandLogo size="lg" layout="column" className="mb-8" />
      <LoginCard signIn={_login} googleLogin={_googleLogin} continueAsGuest={_continueAsGuest} />
    </StyledLoginContainer>
  );
};

export default LoginContainer;
