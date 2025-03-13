import { LoginCard } from "@/components";
import { Stack, styled } from "@mui/material";
import { useNavigate } from "react-router";
import { take, tap } from "rxjs";
import { useAuthSlice } from "../authSlice";

export const StyledLoginContainer = styled(Stack)(({ theme }) => ({
  height: "calc((1 - var(--template-frame-height, 0)) * 100dvh)",
  minHeight: "100%",
  padding: theme.spacing(2),
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(4),
  },
  "&::before": {
    content: '""',
    display: "block",
    position: "absolute",
    zIndex: -1,
    inset: 0,
    backgroundImage: "radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
    backgroundRepeat: "no-repeat",
    ...theme.applyStyles(theme.palette.mode, {
      backgroundImage: "radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))",
    }),
  },
}));

const LoginContainer = () => {
  const navigate = useNavigate();
  const { login, continueAsGuest } = useAuthSlice();

  const _login = (email: string, password: string) => {
    return login(email, password).pipe(tap(() => navigate("/")));
  };

  const _continueAsGuest = () => {
    continueAsGuest()
      .pipe(take(1))
      .subscribe(() => navigate("/"));
  };

  return (
    <StyledLoginContainer>
      <LoginCard signIn={_login} continueAsGuest={_continueAsGuest} />
    </StyledLoginContainer>
  );
};

export default LoginContainer;
