import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { OperatoriService }    from '../../services/operatori.service';
import { LogOperazioniService } from '../../services/log-operazioni.service';
import { PrenotazioniService }  from '../../services/prenotazioni.service';
import { ToastService }         from '../../services/toast.service';

import { Operatore }      from '../../entities/operatore.entity';
import { LogOperazione }  from '../../entities/log-operazione.entity';
import { Prenotazione }   from '../../entities/prenotazione.entity';

type MeseChart = { label: string; value: number; height: number };

const MESI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

@Component({
  selector: 'app-admin',
  standalone: false,
  templateUrl: './admin.html',
  styleUrl:    './admin.css'
})
export class AdminComponent implements OnInit {
  private operatoriSrv    = inject(OperatoriService);
  private logSrv          = inject(LogOperazioniService);
  private prenotazioniSrv = inject(PrenotazioniService);
  private toastSrv        = inject(ToastService);
  private modalSrv        = inject(NgbModal);
  private fb              = inject(FormBuilder);

  @ViewChild('createModal') createModal!: TemplateRef<any>;

  // ── State ────────────────────────────────────────────────
  operatori: Operatore[]     = [];
  logOperazioni: LogOperazione[] = [];
  prenotazioni: Prenotazione[]   = [];

  loading = true;
  saving  = false;

  // ── Filtri chart ─────────────────────────────────────────
  filtroAnno: number = new Date().getFullYear();
  anni: number[] = [];

  // ── Form crea operatore ───────────────────────────────────
  createForm = this.fb.group({
    nome:     ['', Validators.required],
    cognome:  ['', Validators.required],
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  // ────────────────────────────────────────────────────────
  ngOnInit(): void {
    const cur = new Date().getFullYear();
    this.anni = [cur - 2, cur - 1, cur, cur + 1].filter(a => a > 2020);
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    forkJoin({
      operatori:    this.operatoriSrv.getAll(),
      log:          this.logSrv.getAll().pipe(
        catchError(e => {
          this.toastSrv.error(e?.error?.message ?? 'Errore caricamento log operazioni (verifica di avere il ruolo ADMIN)');
          return of([] as LogOperazione[]);
        })
      ),
      prenotazioni: this.prenotazioniSrv.getAll().pipe(
        catchError(() => of([] as Prenotazione[]))
      )
    }).subscribe({
      next: ({ operatori, log, prenotazioni }) => {
        this.operatori    = (operatori ?? []).filter(u => u.ruolo === 'OPERATORE');
        this.logOperazioni = log ?? [];
        this.prenotazioni  = prenotazioni ?? [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  // ── Gestione operatori ───────────────────────────────────
  toggleStatus(op: Operatore): void {
    this.operatoriSrv.toggleStatus(op.id, !op.isActive).subscribe({
      next: () => this.loadAll(),
      error: (e) => { this.toastSrv.error(e?.error?.message ?? 'Errore aggiornamento stato'); }
    });
  }

  openCreate(): void {
    this.createForm.reset();
    this.modalSrv.open(this.createModal, { centered: true, size: 'md' });
  }

  saveCreate(modal: any): void {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.createForm.value;
    this.operatoriSrv.create({
      nome:     v.nome!,
      cognome:  v.cognome!,
      email:    v.email!,
      password: v.password!
    }).subscribe({
      next: () => {
        this.saving = false;
        modal.close();
        this.toastSrv.success(`Utente "${v.nome} ${v.cognome}" creato. Dovrà verificare l'email.`);
        this.loadAll();
      },
      error: (e) => {
        this.saving = false;
        this.toastSrv.error(e?.error?.message ?? 'Errore durante la creazione');
      }
    });
  }

  get operatoriAttiviCount(): number {
    return this.operatori.filter(o => o.isActive).length;
  }

  // ── Chart ricavi ─────────────────────────────────────────
  get chartData(): MeseChart[] {
    const data = MESI.map((label, i) => {
      const value = this.prenotazioni
        .filter(p => {
          const d = new Date(p.dataRitiro);
          return d.getFullYear() === this.filtroAnno
              && d.getMonth() === i
              && (p.stato === 'RITIRATA' || p.stato === 'RESTITUITA');
        })
        .reduce((sum, p) => sum + Number(p.totale), 0);
      return { label, value };
    });
    const maxVal = Math.max(...data.map(d => d.value), 1);
    return data.map(d => ({ ...d, height: Math.round((d.value / maxVal) * 160) }));
  }

  get totaleAnno(): string {
    const tot = this.prenotazioni
      .filter(p => {
        const d = new Date(p.dataRitiro);
        return d.getFullYear() === this.filtroAnno
            && (p.stato === 'RITIRATA' || p.stato === 'RESTITUITA');
      })
      .reduce((sum, p) => sum + Number(p.totale), 0);
    return tot.toFixed(2);
  }

  // ── Log helpers ──────────────────────────────────────────
  tipoLabel(t: string): string {
    const map: Record<string, string> = {
      CONFERMATA: 'Confermata', RITIRATA: 'Ritirata', RESTITUITA: 'Restituita',
      CANCELLATA: 'Cancellata', DANNO: 'Danno',        RITARDO: 'Ritardo'
    };
    return map[t] ?? t;
  }

  tipoBadgeClass(t: string): string {
    if (['CONFERMATA','RITIRATA','RESTITUITA'].includes(t)) return 'log-badge--ok';
    if (t === 'RITARDO') return 'log-badge--warn';
    return 'log-badge--danger';
  }

  dataFmt(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
  }
}
