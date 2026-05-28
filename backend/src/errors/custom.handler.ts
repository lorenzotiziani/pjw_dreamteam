import { NextFunction, Request, Response } from "express";
import {
    UnauthorizedError,
    ForbiddenError,
    BadRequestError,
    InsufficientFundsError
} from "./custom.error";

export const customErrorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const customErrors = [
        UnauthorizedError,
        ForbiddenError,
        BadRequestError,
        InsufficientFundsError
    ];

    for (const ErrorClass of customErrors) {
        if (err instanceof ErrorClass) {
            return res.status((err as any).statusCode).json({
                success: false,
                error: err.name,
                message: err.message
            });
        }
    }

    next(err);
};