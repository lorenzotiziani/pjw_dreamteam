import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { PuntiVenditaService } from '../../services/punti-vendita.service';
import { AuthService } from '../../services/auth.service';
import { TipiBiciService } from '../../services/tipi-bici.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmModalService } from '../../services/confirm-modal.service';
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
  private toastSrv   = inject(ToastService);
  private confirmSrv = inject(ConfirmModalService);
  private modalSrv = inject(NgbModal);
  private fb = inject(FormBuilder);
  private authSrv = inject(AuthService);

  /** Solo l'ADMIN può creare/modificare/eliminare/disattivare le sedi. */
  isAdmin$ = this.authSrv.currentUser$.pipe(map(u => u?.ruolo === 'ADMIN'));

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
    this.confirmSrv.confirm({
      title: 'Elimina punto vendita',
      message: 'Sei sicuro di voler eliminare questo punto vendita?',
      detail: "L'operazione è irreversibile.",
      confirmLabel: 'Elimina',
      type: 'danger'
    }).then(ok => {
      if (!ok) return;
      this.srv.delete(id).subscribe({
        next: () => { this.load(); },
        error: (e) => { this.toastSrv.error(e?.error?.message ?? 'Errore eliminazione'); }
      });
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
    const v      = this.stockForm.value;
    const isEdit = !!this.editingStockId;
    const obs = isEdit
      ? this.srv.updateStock(this.selectedPv.id, this.editingStockId!, {
          quantitaTotale:      v.quantitaTotale!,
          quantitaManutenzione: v.quantitaManutenzione!
        })
      : this.srv.createStock(this.selectedPv.id, {
          tipoBiciId:          v.tipoBiciId!,
          quantitaTotale:      v.quantitaTotale!,
          quantitaManutenzione: v.quantitaManutenzione!
        });
    obs.subscribe({
      next: (res: any) => {
        const record: StockBici = res?.data ?? res;
        // Aggiorna la lista nel modale direttamente con il record restituito dall'API
        if (isEdit) {
          this.stockList = this.stockList.map(s => s.id === record.id ? record : s);
        } else {
          this.stockList = [...this.stockList, record];
        }
        // Propaga il nuovo stockList anche alla card (contatori Bici totali / Disponibili)
        this.puntiVendita = this.puntiVendita.map(pv =>
          pv.id === this.selectedPv!.id ? { ...pv, stockBici: [...this.stockList] } : pv
        );
        this.editingStockId = null;
        this.stockForm.reset({ tipoBiciId: null, quantitaTotale: 1, quantitaManutenzione: 0 });
        this.saving = false;
      },
      error: (e) => { this.toastSrv.error(e?.error?.message ?? 'Errore stock'); this.saving = false; }
    });
  }

  cancelEditStock() {
    this.editingStockId = null;
    this.stockForm.reset({ tipoBiciId: null, quantitaTotale: 1, quantitaManutenzione: 0 });
  }

  /**
   * Eliminazione stock consentita solo se tutte le bici sono "presenti"
   * (disponibili o in manutenzione): nessuna deve essere a noleggio.
   */
  canDeleteStock(s: StockBici): boolean {
    return s.quantitaAttuale + s.quantitaManutenzione >= s.quantitaTotale;
  }

  onDeleteStock(s: StockBici) {
    if (!this.selectedPv) return;
    if (!this.canDeleteStock(s)) {
      this.toastSrv.warn('Impossibile eliminare: alcune bici sono ancora a noleggio. Tutte devono essere disponibili o in manutenzione.');
      return;
    }
    this.confirmSrv.confirm({
      title: 'Elimina stock',
      message: `Sei sicuro di voler eliminare lo stock per "${this.tipoBiciLabel(s.tipoBiciId)}"?`,
      detail: "L'operazione è irreversibile.",
      confirmLabel: 'Elimina',
      type: 'danger'
    }).then(ok => {
      if (!ok) return;
      this.srv.deleteStock(this.selectedPv!.id, s.id).subscribe({
        next: () => {
          this.stockList = this.stockList.filter(x => x.id !== s.id);
          this.puntiVendita = this.puntiVendita.map(pv =>
            pv.id === this.selectedPv!.id ? { ...pv, stockBici: [...this.stockList] } : pv
          );
        },
        error: (e) => { this.toastSrv.error(e?.error?.message ?? 'Errore eliminazione stock'); }
      });
    });
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
