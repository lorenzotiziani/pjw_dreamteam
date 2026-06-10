import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
	selector: 'app-register',
	standalone: false,
	templateUrl: './register.component.html',
	styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {

	protected activatedRoute = inject(ActivatedRoute);
	protected toastSrv = inject(ToastService);

	registerForm: FormGroup;
	registerError: string = '';
	requestedUrl: string | null = null;

	constructor(
		private fb: FormBuilder,
		private registerService: AuthService,
		private router: Router
	) {
		this.registerForm = this.fb.group({
			email: ['', [Validators.required, Validators.email]],
			password: ['', Validators.required],
			confirm: ['', Validators.required],
			nome: ['', Validators.required],
			cognome: ['', Validators.required]
		});

	}

	ngOnInit() {
		// Conserva l'eventuale destinazione richiesta (es. /booking/form) per dopo il login
		this.requestedUrl = this.activatedRoute.snapshot.queryParams['requestedUrl'] ?? null;
	}

	register() {
		if (this.registerForm.invalid) return;
		const {email, password, confirm, nome, cognome} = this.registerForm.value
		this.registerService.register(email, password, confirm, nome, cognome).subscribe({
			next: (res: any) => {
				if (!res.success) {
					this.registerError = res.error || 'Errore sconosciuto';
					this.toastSrv.error(this.registerError);
					return;
				}
				this.toastSrv.success('Registrazione completata! Controlla la tua email per attivare l\'account.');
				// Dopo la registrazione serve verifica email + login:
				// mandiamo al login mantenendo la destinazione (così si torna al form).
				this.router.navigate(['/login'], {
					queryParams: this.requestedUrl ? { requestedUrl: this.requestedUrl } : {}
				});
			},
			error: (err: any) => {
				// Il service restituisce già un Error con messaggio pulito
				this.registerError = err?.message || 'Errore durante la registrazione';
				this.toastSrv.error(this.registerError);
			}

		});

	}
}
