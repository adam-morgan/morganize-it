import { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router";
import { Observable } from "rxjs";
import { Loader2 } from "lucide-react";
import Card from "../card/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export const StyledLoginCard = ({ children }: { children: React.ReactNode }) => (
  <Card className="mx-auto w-full self-center sm:max-w-[450px]">{children}</Card>
);

type LoginCardProps = {
  continueAsGuest: () => void;
  signIn: (email: string, password: string) => Observable<void>;
  googleLogin: (credential: string) => Observable<void>;
};

const LoginCard = (props: LoginCardProps) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [loginError, setLoginError] = useState<string | undefined>();
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
      });
      if (googleButtonRef.current) {
        google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          width: "100%",
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleResponse = (response: { credential: string }) => {
    setIsLoggingIn(true);
    props.googleLogin(response.credential).subscribe({
      complete: () => setIsLoggingIn(false),
      error: (e) => {
        setIsLoggingIn(false);
        setLoginError(e.message);
      },
    });
  };

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
      <Button variant="ghost" className="w-min self-center whitespace-nowrap" onClick={() => props.continueAsGuest()}>
        Continue without signing in
      </Button>
      <h1 className="w-full text-[clamp(2rem,10vw,2.15rem)] font-bold">Sign in</h1>
      <div ref={googleButtonRef} className="flex w-full justify-center" />
      <div className="flex w-full items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-sm text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>
      {loginError && (
        <Alert variant="destructive" className="mt-2 w-full">
          <AlertDescription>{loginError}</AlertDescription>
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
          autoComplete="current-password"
          required
          className={passwordError ? "border-destructive" : ""}
        />
        {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
      </div>
      <Button className="w-full" disabled={isLoggingIn} onClick={signIn}>
        {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign In
      </Button>
      <p className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <RouterLink to="/create-account" className="text-primary underline-offset-4 hover:underline">
          Create one
        </RouterLink>
      </p>
    </StyledLoginCard>
  );
};

export default LoginCard;
