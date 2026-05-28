export class UnauthorizedError extends Error {
    public statusCode: number;

    constructor(message: string = 'Non autorizzato') {
        super(message);
        this.name = 'UnauthorizedError';
        this.statusCode = 401;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ForbiddenError extends Error {
    public statusCode: number;

    constructor(message: string = 'Accesso negato') {
        super(message);
        this.name = 'ForbiddenError';
        this.statusCode = 403;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class BadRequestError extends Error {
    public statusCode: number;

    constructor(message: string = 'Richiesta non valida') {
        super(message);
        this.name = 'BadRequestError';
        this.statusCode = 400;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class InsufficientFundsError extends Error {
    public statusCode: number;

    constructor(message: string = 'Fondi insufficienti') {
        super(message);
        this.name = 'InsufficientFundsError';
        this.statusCode = 400;
        Error.captureStackTrace(this, this.constructor);
    }
}