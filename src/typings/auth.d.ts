interface User extends Entity {
  name: string;
  email: string;
  password?: string;
  tokenInvalidBefore?: string;
}

interface GuestUser extends User {
  isGuest: true;
}

type LoginRequest = {
  email: string;
  password: string;
};

type LoginResponse = {
  user: User;
  token?: string;
  refreshToken?: string;
};

type CreateAccountRequest = {
  email: string;
  password: string;
};

type CreateAccountResponse = {
  user: User;
  token?: string;
  refreshToken?: string;
};

type GoogleLoginRequest = {
  credential: string;
};

type GoogleLoginResponse = {
  user: User;
  token?: string;
  refreshToken?: string;
  isNewUser: boolean;
};

type RefreshRequest = {
  refreshToken: string;
};

type RefreshResponse = {
  token: string;
  refreshToken: string;
};
