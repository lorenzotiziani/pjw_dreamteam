// src/app/core/interceptors/auth.interceptor.ts
import { inject } from '@angular/core';
import {
    HttpHandlerFn,
    HttpRequest,
    HttpErrorResponse,
    HttpClient
} from '@angular/common/http';
import { JwtService } from '../services/jwt.service';

export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  const authTokens = inject(JwtService).getToken();
  // Clone the request to add the authentication header.
  if (authTokens) {
    const newReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${authTokens.token}`),
    });
    return next(newReq);
  } else {
    return next(req);
  }
}