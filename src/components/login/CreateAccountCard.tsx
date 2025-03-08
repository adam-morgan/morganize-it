import { Alert, Button, FormControl, FormLabel, TextField, Typography } from "@mui/material";
import { StyledLoginCard } from "./LoginCard";
import { useState } from "react";
import { Observable } from "rxjs";

type CreateAccountCardProps = {
  createAccount: (email: string, password: string) => Observable<CreateAccountResponse>;
  cancel: () => void;
};

const CreateAccountCard = (props: CreateAccountCardProps) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [passwordConfirm, setPasswordConfirm] = useState<string>("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [passwordConfirmError, setPasswordConfirmError] = useState<string | undefined>();
  const [createAccountError, setCreateAccountError] = useState<string | undefined>();
  const [isCreatingAccount, setIsCreatingAccount] = useState<boolean>(false);

  const createAccount = () => {
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
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      valid = false;
    } else {
      setPasswordError(undefined);
    }

    if (!passwordConfirm) {
      setPasswordConfirmError("Please confirm your password.");
      valid = false;
    } else if (password !== passwordConfirm) {
      setPasswordConfirmError("Passwords do not match.");
      valid = false;
    } else {
      setPasswordConfirmError(undefined);
    }

    if (valid) {
      setIsCreatingAccount(true);

      props.createAccount(email, password).subscribe({
        complete: () => {
          setIsCreatingAccount(false);
        },
        error: (e) => {
          setIsCreatingAccount(false);
          setCreateAccountError(e.message);
        },
      });
    }
  };

  return (
    <StyledLoginCard>
      <Typography
        component="h1"
        variant="h4"
        sx={{ width: "100%", fontSize: "clamp(2rem, 10vw, 2.15rem)" }}
      >
        Create Account
      </Typography>
      {createAccountError && (
        <Alert severity="error" sx={{ width: "100%", mt: 2 }}>
          {createAccountError}
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
          autoFocus
          required
          fullWidth
          variant="outlined"
          color={passwordError ? "error" : "primary"}
        />
      </FormControl>
      <FormControl>
        <FormLabel htmlFor="confirmPassword">Confirm Password</FormLabel>
        <TextField
          error={Boolean(passwordConfirmError)}
          helperText={passwordConfirmError}
          name="confirmPassword"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder="••••••"
          type="password"
          id="confirmPassword"
          autoFocus
          required
          fullWidth
          variant="outlined"
          color={passwordConfirmError ? "error" : "primary"}
        />
      </FormControl>
      <Button
        type="submit"
        fullWidth
        variant="contained"
        loading={isCreatingAccount}
        onClick={createAccount}
      >
        Create Account
      </Button>
      <Button fullWidth onClick={props.cancel}>
        Cancel
      </Button>
    </StyledLoginCard>
  );
};

export default CreateAccountCard;
