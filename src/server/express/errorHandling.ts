import { Application, NextFunction, Request, Response, Router } from "express";

export const handleErrors = (app: Application, router: Router) => {
  app.use((err: Error, _req: Request, res: Response, _next: Function) => {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  });

  const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  router.stack.forEach((layer) => {
    if (layer.route != null) {
      layer.route.stack.forEach((route) => {
        if (route.handle.length <= 3) {
          route.handle = asyncHandler(route.handle);
        }
      });
    }
  });
};
