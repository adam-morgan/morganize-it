import { getAuthService } from "@/server/features";
import { Request, Response, Router } from "express";

export const authRoutes = (router: Router) => {
  router.get("/auth/whoami", (req: Request<void>, res: Response<User | ApiError | {}>) => {
    if (req.session.userId) {
      getAuthService()
        .getUser(req.session.userId, false)
        .then((user) => {
          res.json(user);
        })
        .catch((e) => {
          console.error(e);
          res.status(500).json({ message: "Internal Server Error" });
        });
    } else {
      res.status(200).json({});
    }
  });

  router.post(
    "/auth/login",
    (req: Request<LoginRequest>, res: Response<LoginResponse | ApiError>) => {
      getAuthService()
        .login(req.body.email, req.body.password)
        .then((response) => {
          req.session.userId = response.user.id;
          res.json(response);
        })
        .catch((error) => {
          console.error(error);
          res.status(401).json({ message: "Invalid email or password" });
        });
    }
  );

  router.post("/auth/logout", (req: Request<void>, res: Response<void>) => {
    req.session.destroy(() => {
      res.status(200).end();
    });
  });

  router.post(
    "/auth/create-account",
    async (req: Request<CreateAccountRequest>, res: Response<CreateAccountResponse | ApiError>) => {
      const authService = getAuthService();

      const existingUser = await authService.getUserByEmail(req.body.email, false);

      if (existingUser != null) {
        res.status(400).json({ message: "A User account already exists with that email address" });
        return;
      }

      const user: Omit<User, "id"> = {
        email: req.body.email,
        password: req.body.password,
        name: req.body.email.split("@")[0],
      };

      const createdUser = await authService.createUser(user);
      req.session.userId = createdUser.id;
      res.json({ user: createdUser });
    }
  );
};
