import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PrenotazioniService } from '../../services/prenotazioni.service';
import { PuntiVenditaService } from '../../services/punti-vendita.service';
import { Prenotazione, StatoPrenotazione } from '../../entities/prenotazione.entity';
import { PuntoVendita } from '../../entities/punto-vendita.entity';

@Component({
  selector: 'app-prenotazioni',
  standalone: false,
  templateUrl: './prenotazioni.html',
  styleUrl: './prenotazioni.css'
})
export class PrenotazioniComponent implements OnInit {
  private prenotazioniSrv = inject(PrenotazioniService);
  private puntiVenditaSrv = inject(PuntiVenditaService);
  private modalSrv = inject(NgbModal);
  private fb = inject(FormBuilder);

  @ViewChild('detailModal') detailModal!: TemplateRef<any>;
  @ViewChild('editModal')   editModal!: TemplateRef<any>;

  prenotazioni: Prenotazione[] = [];
  puntiVendita: PuntoVendita[] = [];
  loading = true;
  actionLoading = false;
  saving = false;
  errorMsg = '';

  selectedPrenotazione: Prenotazione | null = null;
  editingPrenotazione: Prenotazione | null = null;

  // Filters
  filtroTesto = '';
  filtroStato = '';
  filtroSede  = '';
  filtroData  = '';

  readonly statiList: { value: StatoPrenotazione | ''; label: string }[] = [
    { value: '',            label: 'Tutti gli stati' },
    { value: 'IN_ATTESA',   label: 'In attesa' },
    { value: 'CONFERMATA',  label: 'Confermata' },
    { value: 'RITIRATA',    label: 'Ritirata' },
    { value: 'RESTITUITA',  label: 'Restituita' },
    { value: 'CANCELLATA',  label: 'Cancellata' }
  ];

  editForm = this.fb.group({
    dataRitiro:        ['', Validators.required],
    oraRitiro:         ['', Validators.required],
    dataOraRiconsegna: ['', Validators.required]
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────
  ngOnInit() {
    this.puntiVenditaSrv.getAll().subscribe(pv => { this.puntiVendita = pv ?? []; });
    this.loadPrenotazioni();
  }

  loadPrenotazioni() {
    this.loading = true;
    this.prenotazioniSrv.getAll().subscribe({
      next: data => { this.prenotazioni = data ?? []; this.loading = false; },
      error: (e) => { this.errorMsg = this.parseError(e, 'caricamento'); this.loading = false; }
    });
  }

  // ── Filters ────────────────────────────────────────────────────────────
  get prenotazioniFiltrate(): Prenotazione[] {
    return this.prenotazioni.filter(p => {
      const testo = this.filtroTesto.toLowerCase();
      const matchTesto = !testo
        || (p.utente?.nome ?? '').toLowerCase().includes(testo)
        || (p.utente?.cognome ?? '').toLowerCase().includes(testo)
        || (p.utente?.email ?? '').toLowerCase().includes(testo)
        || String(p.id).includes(testo);
      const matchStato = !this.filtroStato || p.stato === this.filtroStato;
      const matchSede  = !this.filtroSede  || String(p.puntoVenditaId) === this.filtroSede;
      const matchData  = !this.filtroData  || p.dataRitiro?.slice(0, 10) === this.filtroData;
      return matchTesto && matchStato && matchSede && matchData;
    });
  }

  resetFiltri() {
    this.filtroTesto = '';
    this.filtroStato = '';
    this.filtroSede  = '';
    this.filtroData  = '';
  }

  // ── Permessi / 2 giorni prima ──────────────────────────────────────────
  /** Giorni (float) che mancano alla data di ritiro */
  private giorniAlRitiro(p: Prenotazione): number {
    return (new Date(p.dataRitiro).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  }

  /** Modifica date consentita: stato attivo + ritiro > 2 giorni */
  canModify(p: Prenotazione): boolean {
    if (p.stato === 'RITIRATA' || p.stato === 'RESTITUITA' || p.stato === 'CANCELLATA') return false;
    return this.giorniAlRitiro(p) > 2;
  }

  /** Cancellazione (→ CANCELLATA) consentita: IN_ATTESA/CONFERMATA + ritiro > 2 giorni */
  canCancel(p: Prenotazione): boolean {
    if (p.stato !== 'IN_ATTESA' && p.stato !== 'CONFERMATA') return false;
    return this.giorniAlRitiro(p) > 2;
  }

  /** Eliminazione (DELETE) consentita: non ancora ritirata/restituita + ritiro > 2 giorni
   *  Eccezione: se già CANCELLATA, un operatore può eliminarla in qualsiasi momento */
  canDelete(p: Prenotazione): boolean {
    if (p.stato === 'RITIRATA' || p.stato === 'RESTITUITA') return false;
    if (p.stato === 'CANCELLATA') return true;
    return this.giorniAlRitiro(p) > 2;
  }

  /** Mostra il lucchetto nella riga quando l'azione è bloccata dal periodo di 2 giorni */
  isBlocked(p: Prenotazione): boolean {
    if (p.stato === 'RITIRATA' || p.stato === 'RESTITUITA' || p.stato === 'CANCELLATA') return false;
    return this.giorniAlRitiro(p) <= 2;
  }

  // ── Dettaglio ──────────────────────────────────────────────────────────
  openDetail(p: Prenotazione) {
    this.selectedPrenotazione = p;
    this.modalSrv.open(this.detailModal, { size: 'lg', centered: true });
  }

  // ── Modifica ───────────────────────────────────────────────────────────
  openEdit(p: Prenotazione) {
    if (!this.canModify(p)) {
      this.errorMsg = 'Modifica non consentita: il ritiro è previsto tra meno di 2 giorni.';
      return;
    }
    this.editingPrenotazione = p;
    this.editForm.setValue({
      dataRitiro:        p.dataRitiro?.slice(0, 10) ?? '',
      oraRitiro:         p.oraRitiro?.slice(0, 5) ?? '09:00',
      dataOraRiconsegna: this.toDatetimeLocal(p.dataOraRiconsegna)
    });
    this.modalSrv.open(this.editModal, { size: 'md', centered: true });
  }

  saveEdit(modal: any) {
    if (!this.editingPrenotazione || this.editForm.invalid) return;
    // Doppio controllo 2 giorni prima di inviare al server
    if (!this.canModify(this.editingPrenotazione)) {
      this.errorMsg = 'Modifica non consentita: il ritiro è previsto tra meno di 2 giorni.';
      modal.dismiss();
      return;
    }
    const v = this.editForm.value;
    const payload = {
      dataRitiro:        v.dataRitiro!,
      oraRitiro:         v.oraRitiro!.length === 5 ? v.oraRitiro + ':00' : v.oraRitiro!,
      dataOraRiconsegna: v.dataOraRiconsegna!
    };
    this.saving = true;
    this.prenotazioniSrv.update(this.editingPrenotazione.id, payload).subscribe({
      next: () => {
        this.loadPrenotazioni();
        modal.close();
        this.saving = false;
        this.editingPrenotazione = null;
      },
      error: (e) => {
        this.errorMsg = this.parseError(e, 'modifica');
        this.saving = false;
      }
    });
  }

  // ── Aggiorna stato ──────────────────────────────────────────────────────
  onAggiornaStato(event: { id: number; stato: StatoPrenotazione }) {
    const label = this.statoLabel(event.stato).toLowerCase();
    if (!confirm(`Confermi di impostare la prenotazione come "${label}"?`)) return;
    this.actionLoading = true;
    this.prenotazioniSrv.aggiornaStato(event.id, event.stato).subscribe({
      next: () => { this.loadPrenotazioni(); this.actionLoading = false; },
      error: (e) => { this.errorMsg = this.parseError(e, 'aggiornamento stato'); this.actionLoading = false; }
    });
  }

  // ── Elimina ────────────────────────────────────────────────────────────
  onDelete(p: Prenotazione) {
    if (!this.canDelete(p)) {
      this.errorMsg = 'Eliminazione non consentita: il ritiro è previsto tra meno di 2 giorni.';
      return;
    }
    const info = `#${p.id} — ${p.utente?.cognome ?? ''} ${p.utente?.nome ?? ''}`.trim();
    if (!confirm(`Eliminare definitivamente la prenotazione ${info}?\nL'operazione è irreversibile.`)) return;
    this.prenotazioniSrv.delete(p.id).subscribe({
      next: () => { this.loadPrenotazioni(); },
      error: (e) => { this.errorMsg = this.parseError(e, 'eliminazione'); }
    });
  }

  // ── Error parser ───────────────────────────────────────────────────────
  parseError(e: any, ctx: string): string {
    const status: number = e?.status ?? 0;
    const raw: string    = (e?.error?.message ?? e?.message ?? '').toLowerCase();

    // Messaggi backend specifici
    if (raw.includes('meno di 2h') || raw.includes('2h'))
      return `${this.ctxLabel(ctx)} non consentit${ctx === 'eliminazione' ? 'a' : 'a'}: il ritiro è previsto entro le prossime 2 ore.`;
    if (raw.includes('non trovata') || raw.includes('not found'))
      return 'Prenotazione non trovata. Potrebbe essere già stata eliminata.';
    if (raw.includes('stato') && raw.includes('non valido'))
      return 'Transizione di stato non consentita per questa prenotazione.';
    if (raw.includes('formato') || raw.includes('orario') || raw.includes('data'))
      return 'Formato data o orario non valido. Controlla i campi e riprova.';

    // Messaggi per codice HTTP
    if (status === 400) return `Dati non validi: ${e?.error?.message ?? 'controlla i campi inseriti.'}`;
    if (status === 403) return 'Non sei autorizzato a eseguire questa operazione.';
    if (status === 404) return 'Prenotazione non trovata.';
    if (status === 409) return 'Conflitto: la prenotazione è stata modificata da un altro operatore.';
    if (status === 0)   return 'Impossibile contattare il server. Verifica la connessione.';
    if (status >= 500)  return 'Errore del server. Riprova tra qualche momento.';

    // Fallback: mostra il messaggio backend se c'è, altrimenti generico
    return e?.error?.message ?? `Errore durante ${ctx}.`;
  }

  private ctxLabel(ctx: string): string {
    const m: Record<string, string> = {
      modifica:            'Modifica',
      eliminazione:        'Eliminazione',
      'aggiornamento stato': 'Aggiornamento stato',
      caricamento:         'Caricamento'
    };
    return m[ctx] ?? 'Operazione';
  }

  // ── Helper date ────────────────────────────────────────────────────────
  private toDatetimeLocal(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  dataFmt(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('it-IT');
  }

  dataOraFmt(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('it-IT');
  }

  // ── Labels / badge ──────────────────────────────────────────────────────
  statoLabel(s: StatoPrenotazione): string {
    const m: Record<StatoPrenotazione, string> = {
      IN_ATTESA: 'In attesa', CONFERMATA: 'Confermata',
      RITIRATA: 'Ritirata', RESTITUITA: 'Restituita', CANCELLATA: 'Cancellata'
    };
    return m[s];
  }

  statoBadgeClass(s: StatoPrenotazione): string {
    const m: Record<StatoPrenotazione, string> = {
      IN_ATTESA: 'badge-attesa', CONFERMATA: 'badge-confermata',
      RITIRATA:  'badge-ritirata', RESTITUITA: 'badge-restituita', CANCELLATA: 'badge-cancellata'
    };
    return m[s];
  }
}
