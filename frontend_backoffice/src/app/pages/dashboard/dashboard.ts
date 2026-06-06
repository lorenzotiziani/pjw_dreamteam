import { Component, inject, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { PrenotazioniService } from '../../services/prenotazioni.service';
import { PuntiVenditaService } from '../../services/punti-vendita.service';
import { Prenotazione, StatoPrenotazione } from '../../entities/prenotazione.entity';
import { PuntoVendita } from '../../entities/punto-vendita.entity';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private prenotazioniSrv = inject(PrenotazioniService);
  private puntiVenditaSrv = inject(PuntiVenditaService);

  prenotazioni: Prenotazione[] = [];
  puntiVendita: PuntoVendita[] = [];
  loading = true;
  error = false;

  readonly oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  readonly statoItems: Array<{ stato: string; label: string; color: string }> = [
    { stato: 'IN_ATTESA',   label: 'In attesa',   color: '#f59e0b' },
    { stato: 'CONFERMATA',  label: 'Confermata',  color: '#3b82f6' },
    { stato: 'RITIRATA',    label: 'Ritirata',    color: '#1d4ed8' },
    { stato: 'RESTITUITA',  label: 'Restituita',  color: '#10b981' },
    { stato: 'CANCELLATA',  label: 'Cancellata',  color: '#ef4444' },
    { stato: 'DANNO',       label: 'Danno',       color: '#dc2626' },
    { stato: 'RITARDO',     label: 'Ritardo',     color: '#d97706' },
  ];

  readonly iconClipboard = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>`;
  readonly iconTrendingUp = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`;
  readonly iconCalendarCheck = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/></svg>`;
  readonly iconMapPin = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;

  ngOnInit() {
    this.loading = true;
    this.error = false;
    forkJoin({
      prenotazioni: this.prenotazioniSrv.getAll(),
      puntiVendita: this.puntiVenditaSrv.getAll()
    }).subscribe({
      next: ({ prenotazioni, puntiVendita }) => {
        this.prenotazioni = prenotazioni ?? [];
        this.puntiVendita = puntiVendita ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  reload() { this.ngOnInit(); }

  get totalePrenotazioni(): number { return this.prenotazioni.length; }

  get ricaviTotali(): string {
    const tot = this.prenotazioni
      .filter(p => p.stato === 'RITIRATA' || p.stato === 'RESTITUITA')
      .reduce((s, p) => s + Number(p.totale), 0);
    return tot.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  get prenotazioniOggi(): number {
    const oggi = new Date().toDateString();
    return this.prenotazioni.filter(p => new Date(p.dataRitiro).toDateString() === oggi).length;
  }

  get puntiVenditaAttivi(): number {
    return this.puntiVendita.filter(p => p.attivo).length;
  }

  get conteggioPerStato(): Record<StatoPrenotazione, number> {
    const result: Record<StatoPrenotazione, number> = {
      IN_ATTESA: 0, CONFERMATA: 0, RITIRATA: 0, RESTITUITA: 0, CANCELLATA: 0, DANNO: 0, RITARDO: 0
    };
    this.prenotazioni.forEach(p => { if (p.stato in result) result[p.stato]++; });
    return result;
  }

  get percentualeStato(): Record<StatoPrenotazione, number> {
    const tot = this.prenotazioni.length || 1;
    const c = this.conteggioPerStato;
    return {
      IN_ATTESA:  Math.round(c.IN_ATTESA  / tot * 100),
      CONFERMATA: Math.round(c.CONFERMATA / tot * 100),
      RITIRATA:   Math.round(c.RITIRATA   / tot * 100),
      RESTITUITA: Math.round(c.RESTITUITA / tot * 100),
      CANCELLATA: Math.round(c.CANCELLATA / tot * 100),
      DANNO:      Math.round(c.DANNO      / tot * 100),
      RITARDO:    Math.round(c.RITARDO    / tot * 100)
    };
  }

  get prenotazioniRecenti(): Prenotazione[] {
    return [...this.prenotazioni]
      .sort((a, b) => new Date(b.creataIl).getTime() - new Date(a.creataIl).getTime())
      .slice(0, 6);
  }

  get prenotazioniInAttesa(): number { return this.conteggioPerStato.IN_ATTESA; }
  get prenotazioniRitirate(): number { return this.conteggioPerStato.RITIRATA; }

  statoLabel(s: StatoPrenotazione): string {
    const m: Record<StatoPrenotazione, string> = {
      IN_ATTESA: 'In attesa', CONFERMATA: 'Confermata',
      RITIRATA:  'Ritirata',  RESTITUITA: 'Restituita',
      CANCELLATA: 'Cancellata', DANNO: 'Danno', RITARDO: 'Ritardo'
    };
    return m[s] ?? s;
  }

  statoBadgeClass(s: StatoPrenotazione): string {
    const m: Record<StatoPrenotazione, string> = {
      IN_ATTESA:  'badge-attesa',    CONFERMATA: 'badge-confermata',
      RITIRATA:   'badge-ritirata',  RESTITUITA: 'badge-restituita',
      CANCELLATA: 'badge-cancellata', DANNO: 'badge-danno', RITARDO: 'badge-ritardo'
    };
    return m[s] ?? '';
  }

  getConteggio(stato: string): number { return this.conteggioPerStato[stato as StatoPrenotazione] ?? 0; }
  getPercentuale(stato: string): number { return this.percentualeStato[stato as StatoPrenotazione] ?? 0; }

  dataFmt(d: string): string { return new Date(d).toLocaleDateString('it-IT'); }

  trackByStato(_: number, item: { stato: string }): string { return item.stato; }
  trackByPv(_: number, pv: PuntoVendita): number { return pv.id; }
  trackByPren(_: number, p: Prenotazione): number { return p.id; }
}
