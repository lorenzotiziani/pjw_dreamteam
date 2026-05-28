import { HttpInterceptorFn, HttpClient, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, switchMap, throwError } from "rxjs";
import { AuthService } from "../services/auth.service";
import { JwtService } from "../services/jwt.service";

export const logoutInterceptor: HttpInterceptorFn = (req, next) => {
    const authSrv = inject(AuthService);
    const jwtSrv = inject(JwtService);
    const http = inject(HttpClient);


    if (req.url.includes('/api/login') || req.url.includes('/api/refresh')) {
        return next(req);
    }

    return next(req).pipe(
        catchError((response: any) => {
            if (response instanceof HttpErrorResponse && response.status === 401) {
                if (jwtSrv.areTokensValid()) {
                    return authSrv.refresh().pipe(
                        switchMap(() => {
                            const newAuthTokens = jwtSrv.getToken();
                            const newReq = req.clone({
                                headers: req.headers.set('Authorization', `Bearer ${newAuthTokens?.token}`),
                            });
                            return next(newReq);
                        }),
                        catchError(() => {
                            authSrv.logout();
                            return throwError(() => response);
                        })
                    );
                } else {
                    authSrv.logout();
                    return throwError(() => response);
                }
            }
            return throwError(() => response);
        })
    );
};