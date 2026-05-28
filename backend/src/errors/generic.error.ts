import { NextFunction, Request, Response } from "express";

export const genericHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error('🔴 Errore non gestito:', err);

    if (res.headersSent) {
        return next(err);
    }

    const statusCode = (err as any).statusCode || 500;

    res.status(statusCode).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Errore interno del server'
            : err.message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            details: err
        })
    });
};