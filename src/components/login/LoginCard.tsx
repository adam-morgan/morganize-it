import {
  Alert,
  Button,
  FormControl,
  FormLabel,
  Link,
  styled,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { Link as RouterLink } from "react-router";
import { Observable } from "rxjs";
import Card from "../card/Card";

export const StyledLoginCard = styled(Card)(({ theme }) => ({
  alignSelf: "center",
  width: "100%",
  margin: "auto",
  [theme.breakpoints.up("sm")]: {
    maxWidth: "450px",
  },
}));

type LoginCardProps = {
  continueAsGuest: () => void;
  signIn: (email: string, password: string) => Observable<void>;
};

const LoginCard = (props: LoginCardProps) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [loginError, setLoginError] = useState<string | undefined>();
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const signIn = () => {
    let valid = true;

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    } else {
      setEmailError(undefined);
    }

    if (!password) {
      setPasswordError("Please enter a password.");
      valid = false;
    } else {
      setPasswordError(undefined);
    }

    if (valid) {
      setIsLoggingIn(true);

      props.signIn(email, password).subscribe({
        complete: () => {
          setIsLoggingIn(false);
        },
        error: (e) => {
          setIsLoggingIn(false);
          setLoginError(e.message);
        },
      });
    }
  };

  return (
    <StyledLoginCard>
      <Button
        variant="text"
        sx={{ width: "min-content", alignSelf: "center", whiteSpace: "nowrap" }}
        onClick={() => props.continueAsGuest()}
      >
        Continue without signing in
      </Button>
      <Typography
        component="h1"
        variant="h4"
        sx={{ width: "100%", fontSize: "clamp(2rem, 10vw, 2.15rem)" }}
      >
        Sign in
      </Typography>
      {loginError && (
        <Alert severity="error" sx={{ width: "100%", mt: 2 }}>
          {loginError}
        </Alert>
      )}
      <FormControl>
        <FormLabel htmlFor="email">Email</FormLabel>
        <TextField
          error={Boolean(emailError)}
          helperText={emailError}
          id="email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          autoComplete="email"
          autoFocus
          required
          fullWidth
          variant="outlined"
          color={emailError ? "error" : "primary"}
        />
      </FormControl>
      <FormControl>
        <FormLabel htmlFor="password">Password</FormLabel>
        <TextField
          error={Boolean(passwordError)}
          helperText={passwordError}
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••"
          type="password"
          id="password"
          autoComplete="current-password"
          autoFocus
          required
          fullWidth
          variant="outlined"
          color={passwordError ? "error" : "primary"}
        />
      </FormControl>
      <Button type="submit" fullWidth variant="contained" loading={isLoggingIn} onClick={signIn}>
        Sign In
      </Button>
      <Typography sx={{ textAlign: "center" }}>
        Don&apos;t have an account?{" "}
        <Link component={RouterLink} to="/create-account" underline="none">
          Create one
        </Link>
      </Typography>
    </StyledLoginCard>
  );
};

export default LoginCard;
