import { useState } from "react";
import { Observable } from "rxjs";
import { Loader2 } from "lucide-react";
import { StyledLoginCard } from "./LoginCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type CreateAccountCardProps = {
  createAccount: (email: string, password: string) => Observable<unknown>;
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
      <h1 className="w-full text-[clamp(2rem,10vw,2.15rem)] font-bold">Create Account</h1>
      {createAccountError && (
        <Alert variant="destructive" className="mt-2 w-full">
          <AlertDescription>{createAccountError}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          autoComplete="email"
          autoFocus
          required
          className={emailError ? "border-destructive" : ""}
        />
        {emailError && <p className="text-sm text-destructive">{emailError}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••"
          type="password"
          id="password"
          required
          className={passwordError ? "border-destructive" : ""}
        />
        {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          name="confirmPassword"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder="••••••"
          type="password"
          id="confirmPassword"
          required
          className={passwordConfirmError ? "border-destructive" : ""}
        />
        {passwordConfirmError && <p className="text-sm text-destructive">{passwordConfirmError}</p>}
      </div>
      <Button className="w-full" disabled={isCreatingAccount} onClick={createAccount}>
        {isCreatingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Account
      </Button>
      <Button variant="outline" className="w-full" onClick={props.cancel}>
        Cancel
      </Button>
    </StyledLoginCard>
  );
};

export default CreateAccountCard;
