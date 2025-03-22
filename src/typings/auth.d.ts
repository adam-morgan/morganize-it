interface User extends Entity {
  name: string;
  email: string;
  password?: string;
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
};

type CreateAccountRequest = {
  email: string;
  password: string;
};

type CreateAccountResponse = {
  user: User;
};
