import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
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

  @ViewChild('detailModal') detailModal!: TemplateRef<any>;

  prenotazioni: Prenotazione[] = [];
  puntiVendita: PuntoVendita[] = [];
  loading = true;
  actionLoading = false;
  errorMsg = '';

  selectedPrenotazione: Prenotazione | null = null;

  // Filters
  filtroTesto = '';
  filtroStato = '';
  filtroSede = '';
  filtroData = '';

  readonly statiList: { value: StatoPrenotazione | ''; label: string }[] = [
    { value: '', label: 'Tutti gli stati' },
    { value: 'IN_ATTESA', label: 'In attesa' },
    { value: 'CONFERMATA', label: 'Confermata' },
    { value: 'RITIRATA', label: 'Ritirata' },
    { value: 'RESTITUITA', label: 'Restituita' },
    { value: 'CANCELLATA', label: 'Cancellata' }
  ];

  ngOnInit() {
    this.puntiVenditaSrv.getAll().subscribe(pv => { this.puntiVendita = pv ?? []; });
    this.loadPrenotazioni();
  }

  loadPrenotazioni() {
    this.loading = true;
    this.prenotazioniSrv.getAll().subscribe({
      next: data => { this.prenotazioni = data ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get prenotazioniFiltrate(): Prenotazione[] {
    return this.prenotazioni.filter(p => {
      const testo = this.filtroTesto.toLowerCase();
      const matchTesto = !testo
        || (p.utente?.nome ?? '').toLowerCase().includes(testo)
        || (p.utente?.cognome ?? '').toLowerCase().includes(testo)
        || (p.utente?.email ?? '').toLowerCase().includes(testo)
        || String(p.id).includes(testo);
      const matchStato = !this.filtroStato || p.stato === this.filtroStato;
      const matchSede = !this.filtroSede || String(p.puntoVenditaId) === this.filtroSede;
      const matchData = !this.filtroData || p.dataRitiro?.slice(0, 10) === this.filtroData;
      return matchTesto && matchStato && matchSede && matchData;
    });
  }

  openDetail(p: Prenotazione) {
    this.selectedPrenotazione = p;
    this.modalSrv.open(this.detailModal, { size: 'lg', centered: true });
  }

  onAggiornaStato(event: { id: number; stato: StatoPrenotazione }) {
    if (!confirm(`Confermi l'aggiornamento dello stato a "${event.stato}"?`)) return;
    this.actionLoading = true;
    this.prenotazioniSrv.aggiornaStato(event.id, event.stato).subscribe({
      next: () => { this.loadPrenotazioni(); this.actionLoading = false; },
      error: (e) => { this.errorMsg = e?.error?.message ?? 'Errore aggiornamento stato'; this.actionLoading = false; }
    });
  }

  onDelete(id: number) {
    if (!confirm('Eliminare questa prenotazione? L\'operazione è irreversibile.')) return;
    this.prenotazioniSrv.delete(id).subscribe({
      next: () => { this.loadPrenotazioni(); },
      error: (e) => { this.errorMsg = e?.error?.message ?? 'Errore eliminazione'; }
    });
  }

  resetFiltri() {
    this.filtroTesto = '';
    this.filtroStato = '';
    this.filtroSede = '';
    this.filtroData = '';
  }

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
      RITIRATA: 'badge-ritirata', RESTITUITA: 'badge-restituita', CANCELLATA: 'badge-cancellata'
    };
    return m[s];
  }

  dataFmt(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('it-IT');
  }
  dataOraFmt(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('it-IT');
  }
}
