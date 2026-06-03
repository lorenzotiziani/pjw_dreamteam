import { inject } from "@angular/core";
import { JwtService } from "../services/jwt.service";
import { HttpHandlerFn, HttpRequest } from "@angular/common/http";

export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  // Inject del JwtService e uso la funzione per ottenere i tokens
  const authTokens = inject(JwtService).getToken();
  // clono la richiesta per aggiugere l'authentication header
  if (authTokens) {
    const newReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${authTokens.token}`),
    });
    return next(newReq);
  } else {
    return next(req);
  }
}