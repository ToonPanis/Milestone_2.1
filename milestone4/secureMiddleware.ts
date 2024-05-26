import { NextFunction, Request, Response } from "express";
import { userInfo } from "os";

export function secureMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.session.user) {
        res.locals.user = req.session.user;
        next();
    } else {
        res.redirect("/login");
    }
};

export function secureMiddlewareAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.session.user && req.session.user.role === "ADMIN") {
        res.locals.user = req.session.user;
        next();
    } else {
        res.redirect("/songs");
    }
};