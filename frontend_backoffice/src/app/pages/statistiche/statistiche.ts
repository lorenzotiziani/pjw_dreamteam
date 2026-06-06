import { Component, inject, OnInit } from '@angular/core';
import { PrenotazioniService } from '../../services/prenotazioni.service';
import { Prenotazione } from '../../entities/prenotazione.entity';
import { MeseChart, StatoRow, StatsKpi, PvRow, BiciRow } from '../../components/statistiche-view/statistiche-view';

const MESI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

const STATI_CONFIG = [
  { stato: 'IN_ATTESA',  label: 'In attesa',  colore: '#f59e0b' },
  { stato: 'CONFERMATA', label: 'Confermata', colore: '#3b82f6' },
  { stato: 'RITIRATA',   label: 'Ritirata',   colore: '#8b5cf6' },
  { stato: 'RESTITUITA', label: 'Restituita', colore: '#22c55e' },
  { stato: 'CANCELLATA', label: 'Cancellata', colore: '#94a3b8' },
  { stato: 'DANNO',      label: 'Danno',      colore: '#ef4444' },
  { stato: 'RITARDO',    label: 'Ritardo',    colore: '#f97316' },
];

const BICI_CONFIG: Record<string, { label: string; colore: string }> = {
  CITY_BIKE:     { label: 'City Bike',     colore: '#0ea5e9' },
  MOUNTAIN_BIKE: { label: 'Mountain Bike', colore: '#22c55e' },
  GRAVEL:        { label: 'Gravel',        colore: '#f59e0b' },
  ROAD_BIKE:     { label: 'Road Bike',     colore: '#8b5cf6' },
};

// Stati che generano ricavo effettivo
const RICAVI_STATI = ['RITIRATA', 'RESTITUITA', 'DANNO', 'RITARDO'];

const CHART_MAX_PX = 160;

@Component({
  selector: 'app-statistiche',
  standalone: false,
  templateUrl: './statistiche.html',
  styleUrl: './statistiche.css'
})
export class StatisticheComponent implements OnInit {
  private prenSrv = inject(PrenotazioniService);

  loading    = true;
  filtroAnno = new Date().getFullYear();
  anni: number[] = [];

  kpis: StatsKpi = { ricaviTotali: 0, prenotazioniTotali: 0, completate: 0, mediaRicavo: 0 };
  chartData: MeseChart[]   = MESI.map(label => ({ label, value: 0, height: 0 }));
  statoBreakdown: StatoRow[] = STATI_CONFIG.map(({ stato, label, colore }) => ({ stato, label, colore, count: 0, percent: 0 }));
  pvBreakdown: PvRow[]     = [];
  biciBreakdown: BiciRow[] = [];

  /** Tutte le prenotazioni in memoria — le aggregazioni si ricalcolano lato client */
  private tutte: Prenotazione[] = [];

  ngOnInit(): void {
    const cur = new Date().getFullYear();
    this.anni = [cur - 2, cur - 1, cur, cur + 1].filter(a => a > 2020);
    this.load();
  }

  load(): void {
    this.loading = true;
    this.prenSrv.getAll().subscribe({
      next: data => {
        this.tutte = data ?? [];
        this.computeStats(this.filtroAnno);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onAnnoChange(anno: number): void {
    this.filtroAnno = anno;
    this.computeStats(anno);
  }

  // ─── Aggregazioni ──────────────────────────────────────────

  private computeStats(anno: number): void {
    const delAnno = this.tutte.filter(p =>
      new Date(p.dataRitiro).getFullYear() === anno
    );

    this.computeKpi(delAnno);
    this.computeChart(delAnno);
    this.computeStatoBreakdown();     // sempre storico completo
    this.computeBiciBreakdown(delAnno);
    this.computePvBreakdown(delAnno);
  }

  private computeKpi(delAnno: Prenotazione[]): void {
    const conRicavo  = delAnno.filter(p => RICAVI_STATI.includes(p.stato));
    const ricaviTotali = conRicavo.reduce((s, p) => s + Number(p.totale), 0);
    const completate = delAnno.filter(p => p.stato === 'RESTITUITA').length;
    const prenotazioniTotali = delAnno.length;
    const mediaRicavo = completate > 0 ? ricaviTotali / completate : 0;
    this.kpis = { ricaviTotali, prenotazioniTotali, completate, mediaRicavo };
  }

  private computeChart(delAnno: Prenotazione[]): void {
    const conRicavo = delAnno.filter(p => RICAVI_STATI.includes(p.stato));
    const totaliMese = MESI.map((_, i) =>
      conRicavo
        .filter(p => new Date(p.dataRitiro).getMonth() === i)
        .reduce((s, p) => s + Number(p.totale), 0)
    );
    const maxVal = Math.max(...totaliMese, 1);
    this.chartData = MESI.map((label, i) => ({
      label,
      value: totaliMese[i],
      height: Math.round((totaliMese[i] / maxVal) * CHART_MAX_PX)
    }));
  }

  private computeStatoBreakdown(): void {
    const totale = this.tutte.length || 1;
    this.statoBreakdown = STATI_CONFIG.map(({ stato, label, colore }) => {
      const count = this.tutte.filter(p => p.stato === stato).length;
      return { stato, label, colore, count, percent: Math.round((count / totale) * 100) };
    });
  }

  private computeBiciBreakdown(delAnno: Prenotazione[]): void {
    const map = new Map<string, number>();
    for (const p of delAnno) {
      for (const r of p.righe ?? []) {
        const cat = r.tipoBici?.categoria ?? 'UNKNOWN';
        map.set(cat, (map.get(cat) ?? 0) + 1);
      }
    }
    const totBici = Array.from(map.values()).reduce((s, v) => s + v, 0) || 1;
    this.biciBreakdown = Array.from(map.entries())
      .map(([categoria, count]) => ({
        categoria,
        label:   BICI_CONFIG[categoria]?.label   ?? categoria,
        colore:  BICI_CONFIG[categoria]?.colore  ?? '#94a3b8',
        count,
        percent: Math.round((count / totBici) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private computePvBreakdown(delAnno: Prenotazione[]): void {
    const map = new Map<string, PvRow>();
    for (const p of delAnno) {
      const nome  = p.puntoVendita?.nome  ?? `Sede ${p.puntoVenditaId}`;
      const citta = p.puntoVendita?.citta ?? '';
      const row   = map.get(nome) ?? { nome, citta, count: 0, ricavi: 0, barPercent: 0 };
      row.count++;
      if (RICAVI_STATI.includes(p.stato)) row.ricavi += Number(p.totale);
      map.set(nome, row);
    }
    const rows = Array.from(map.values()).sort((a, b) => b.count - a.count);
    const maxCount = rows[0]?.count || 1;
    this.pvBreakdown = rows.map(r => ({
      ...r,
      barPercent: Math.round((r.count / maxCount) * 100)
    }));
  }
}
