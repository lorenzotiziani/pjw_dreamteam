import { validationError } from "./validation.error";
import { notFoundHandler } from "./notFound.error";
import { customErrorHandler } from "./custom.handler";
import { genericHandler } from "./generic.error";

export const handlers = [
    validationError,
    customErrorHandler,
    notFoundHandler,
    genericHandler
];

export * from "./custom.error";
export { NotFoundError } from "./notFound.error";