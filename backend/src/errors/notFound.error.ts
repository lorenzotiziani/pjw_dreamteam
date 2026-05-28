import { NextFunction, Request, Response } from "express";

export class NotFoundError extends Error {
    public statusCode: number;

    constructor(message: string = 'Risorsa non trovata') {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;

        Error.captureStackTrace(this, this.constructor);
    }
}

export const notFoundHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof NotFoundError) {
        return res.status(404).json({
            success: false,
            error: 'NotFoundError',
            message: err.message
        });
    }
    next(err);
};