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

  readonly oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  ngOnInit() {
    forkJoin({
      prenotazioni: this.prenotazioniSrv.getAll(),
      puntiVendita: this.puntiVenditaSrv.getAll()
    }).subscribe({
      next: ({ prenotazioni, puntiVendita }) => {
        this.prenotazioni = prenotazioni ?? [];
        this.puntiVendita = puntiVendita ?? [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

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
}
