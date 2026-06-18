import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute,Router } from '@angular/router';
import { map, Subject, takeUntil } from 'rxjs';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  protected activatedRoute = inject(ActivatedRoute);
  protected toastSrv = inject(ToastService);
  protected destroyed$ = new Subject<void>();
  loginForm: FormGroup;
  loginError: string = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private loginService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  requestedUrl: string | null = null;
  ngOnInit() {
    this.loginForm.valueChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe(_ => {
        this.loginError = '';
      });

    this.activatedRoute.queryParams
      .pipe(
        takeUntil(this.destroyed$),
        map(params => params['requestedUrl'])
      )
      .subscribe(url => {
        this.requestedUrl = url;
      });
  }

  login() {
    if (this.loginForm.invalid || this.loading) {
      // Mostra gli errori di validazione inline sotto i campi (nessun toast,
      // nessuna chiamata: gli errori del form si gestiscono qui).
      this.loginForm.markAllAsTouched();
      return;
    }

    const { username, password } = this.loginForm.value;

    this.loading = true;
    this.loginService.login(username, password).subscribe({
      next: () => {
        this.loading = false;
        this.toastSrv.success('Accesso effettuato. Bentornato!');
        this.router.navigate([this.requestedUrl ? this.requestedUrl : '/']);
      },
      error: (err: Error) => {
        this.loading = false;
        // Errore del backend (es. credenziali errate) → solo toast
        this.toastSrv.error(err.message || 'Credenziali errate.');
      }
    });
  }


}
