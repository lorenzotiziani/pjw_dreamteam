import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin, of } from 'rxjs';
import { PuntiVenditaService } from '../../services/punti-vendita.service';
import { TipiBiciService } from '../../services/tipi-bici.service';
import { ToastService } from '../../services/toast.service';
import { PuntoVendita, StockBici } from '../../entities/punto-vendita.entity';
import { TipoBici } from '../../entities/tipo-bici.entity';

@Component({
  selector: 'app-punti-vendita',
  standalone: false,
  templateUrl: './punti-vendita.html',
  styleUrl: './punti-vendita.css'
})
export class PuntiVenditaComponent implements OnInit {
  private srv = inject(PuntiVenditaService);
  private tipiBiciSrv = inject(TipiBiciService);
  private toastSrv = inject(ToastService);
  private modalSrv = inject(NgbModal);
  private fb = inject(FormBuilder);

  @ViewChild('formModal') formModal!: TemplateRef<any>;
  @ViewChild('stockModal') stockModal!: TemplateRef<any>;

  puntiVendita: PuntoVendita[] = [];
  tipiDiBici: TipoBici[] = [];
  loading = true;
  saving = false;

  editingId: number | null = null;
  selectedPv: PuntoVendita | null = null;
  stockList: StockBici[] = [];
  stockLoading = false;

  form = this.fb.group({
    nome: ['', Validators.required],
    indirizzo: ['', Validators.required],
    citta: ['', Validators.required]
  });

  stockForm = this.fb.group({
    tipoBiciId: [null as number | null, Validators.required],
    quantitaTotale: [1, [Validators.required, Validators.min(0)]],
    quantitaManutenzione: [0, [Validators.required, Validators.min(0)]]
  });

  editingStockId: number | null = null;

  ngOnInit() {
    this.tipiBiciSrv.getAll().subscribe(t => { this.tipiDiBici = t ?? []; });
    this.load();
  }

  load() {
    this.loading = true;
    this.srv.getAll().subscribe({
      next: puntiVendita => {
        if (!puntiVendita?.length) {
          this.puntiVendita = [];
          this.loading = false;
          return;
        }
        // Lo smart recupera lo stock per ogni sede e lo inietta in puntoVendita.stockBici
        // così la card (dumb) riceve l'oggetto già completo senza fare chiamate proprie
        forkJoin(puntiVendita.map(pv => this.srv.getStock(pv.id))).subscribe({
          next: stockArrays => {
            this.puntiVendita = puntiVendita.map((pv, i) => ({
              ...pv,
              stockBici: stockArrays[i] ?? []
            }));
            this.loading = false;
          },
          error: () => {
            // Se le chiamate stock falliscono mostra comunque le card (senza contatori)
            this.puntiVendita = puntiVendita;
            this.loading = false;
          }
        });
      },
      error: () => { this.loading = false; }
    });
  }

  openCreate() {
    this.editingId = null;
    this.form.reset({ nome: '', indirizzo: '', citta: '' });
    this.modalSrv.open(this.formModal, { centered: true });
  }

  openEdit(pv: PuntoVendita) {
    this.editingId = pv.id;
    this.form.setValue({ nome: pv.nome, indirizzo: pv.indirizzo, citta: pv.citta });
    this.modalSrv.open(this.formModal, { centered: true });
  }

  save(modal: any) {
    if (this.form.invalid) return;
    this.saving = true;
    const data = this.form.value as { nome: string; indirizzo: string; citta: string };
    const obs = this.editingId
      ? this.srv.update(this.editingId, data)
      : this.srv.create(data);
    obs.subscribe({
      next: () => { this.load(); modal.close(); this.saving = false; },
      error: (e) => { this.toastSrv.error(e?.error?.message ?? 'Errore salvataggio'); this.saving = false; }
    });
  }

  onDelete(id: number) {
    if (!confirm('Eliminare questo punto vendita?')) return;
    this.srv.delete(id).subscribe({
      next: () => { this.load(); },
      error: (e) => { this.toastSrv.error(e?.error?.message ?? 'Errore eliminazione'); }
    });
  }

  onToggleAttivo(pv: PuntoVendita) {
    this.srv.update(pv.id, { attivo: !pv.attivo }).subscribe({
      next: () => { this.load(); },
      error: (e) => { this.toastSrv.error(e?.error?.message ?? 'Errore aggiornamento stato'); }
    });
  }

  openStock(pv: PuntoVendita) {
    this.selectedPv = pv;
    this.stockLoading = true;
    this.editingStockId = null;
    this.stockForm.reset({ tipoBiciId: null, quantitaTotale: 1, quantitaManutenzione: 0 });
    this.srv.getStock(pv.id).subscribe({
      next: data => { this.stockList = data ?? []; this.stockLoading = false; },
      error: () => { this.stockLoading = false; }
    });
    this.modalSrv.open(this.stockModal, { size: 'lg', centered: true });
  }

  editStock(s: StockBici) {
    this.editingStockId = s.id;
    this.stockForm.setValue({
      tipoBiciId: s.tipoBiciId,
      quantitaTotale: s.quantitaTotale,
      quantitaManutenzione: s.quantitaManutenzione
    });
  }

  saveStock() {
    if (!this.selectedPv || this.stockForm.invalid) return;
    this.saving = true;
    const v = this.stockForm.value;
    const obs = this.editingStockId
      ? this.srv.updateStock(this.selectedPv.id, this.editingStockId, {
          quantitaTotale: v.quantitaTotale!,
          quantitaManutenzione: v.quantitaManutenzione!
        })
      : this.srv.createStock(this.selectedPv.id, {
          tipoBiciId: v.tipoBiciId!,
          quantitaTotale: v.quantitaTotale!,
          quantitaManutenzione: v.quantitaManutenzione!
        });
    obs.subscribe({
      next: () => {
        this.editingStockId = null;
        this.stockForm.reset({ tipoBiciId: null, quantitaTotale: 1, quantitaManutenzione: 0 });
        this.srv.getStock(this.selectedPv!.id).subscribe(data => {
          const stock = data ?? [];
          // Aggiorna il modale
          this.stockList = stock;
          // Aggiorna anche la card corrispondente nell'array locale
          // così i contatori (Bici totali / Manutenzione / Disponibili) si riflettono subito
          this.puntiVendita = this.puntiVendita.map(pv =>
            pv.id === this.selectedPv!.id ? { ...pv, stockBici: stock } : pv
          );
          this.saving = false;
        });
      },
      error: (e) => { this.toastSrv.error(e?.error?.message ?? 'Errore stock'); this.saving = false; }
    });
  }

  cancelEditStock() {
    this.editingStockId = null;
    this.stockForm.reset({ tipoBiciId: null, quantitaTotale: 1, quantitaManutenzione: 0 });
  }

  tipoBiciLabel(id: number): string {
    const t = this.tipiDiBici.find(x => x.id === id);
    if (!t) return String(id);
    const cat: Record<string, string> = { CITY_BIKE: 'City', MOUNTAIN_BIKE: 'MTB', GRAVEL: 'Gravel', ROAD_BIKE: 'Road' };
    return `${cat[t.categoria] ?? t.categoria} ${t.motorizzazione === 'ELETTRICA' ? '⚡' : ''} – ${t.taglia}`;
  }

  availableTipi(): TipoBici[] {
    const usedIds = this.stockList.filter(s => s.id !== this.editingStockId).map(s => s.tipoBiciId);
    return this.tipiDiBici.filter(t => !usedIds.includes(t.id));
  }
}
