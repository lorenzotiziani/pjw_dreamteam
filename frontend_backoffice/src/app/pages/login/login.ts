import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, Subject, takeUntil, throwError } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit, OnDestroy {
  protected fb = inject(FormBuilder);
  protected authSrv = inject(AuthService);
  protected router = inject(Router);
  protected activatedRoute = inject(ActivatedRoute);

  protected destroyed$ = new Subject<void>();

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  loginError = '';
  requestedUrl: string | null = null;
  showPassword = false;

  ngOnInit() {
    this.loginForm.valueChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe(_ => { this.loginError = ''; });

    this.activatedRoute.queryParams
      .pipe(takeUntil(this.destroyed$))
      .subscribe(params => {
        this.requestedUrl = params['requestedUrl'] ?? null;
        if (params['error'] === 'forbidden') {
          this.loginError = 'Non hai i permessi per accedere a quest\'area.';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  login() {
    const { email, password } = this.loginForm.value;
    this.authSrv.login(email!, password!)
      .pipe(
        catchError(response => {
          this.loginError = response?.error?.message ?? 'Credenziali errate';
          return throwError(() => response);
        })
      )
      .subscribe(() => {
        this.router.navigate([this.requestedUrl ?? '/']);
      });
  }
}
