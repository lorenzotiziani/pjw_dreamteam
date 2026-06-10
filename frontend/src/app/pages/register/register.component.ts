import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
	selector: 'app-register',
	standalone: false,
	templateUrl: './register.component.html',
	styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {

	protected activatedRoute = inject(ActivatedRoute);

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
					return;
				}
				// Dopo la registrazione serve verifica email + login:
				// mandiamo al login mantenendo la destinazione (così si torna al form).
				this.router.navigate(['/login'], {
					queryParams: this.requestedUrl ? { requestedUrl: this.requestedUrl } : {}
				});
			},
			error: (err: any) => {

				if (Array.isArray(err)) {
					// Errori di validazione dal backend
					this.registerError = err.map(e => e.message).join('<br>');
				} else if (typeof err === 'string') {
					// Errore semplice
					this.registerError = err;
				} else {
					this.registerError = 'Errore di connessione';
				}
			}

		});

	}
}
