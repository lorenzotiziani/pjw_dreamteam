import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TipiBiciService } from '../../services/tipi-bici.service';
import { ToastService } from '../../services/toast.service';
import { TipoBici, CategoriaBici, Motorizzazione, Taglia } from '../../entities/tipo-bici.entity';

@Component({
  selector: 'app-tipi-bici',
  standalone: false,
  templateUrl: './tipi-bici.html',
  styleUrl: './tipi-bici.css'
})
export class TipiBiciComponent implements OnInit {
  private srv = inject(TipiBiciService);
  private toastSrv = inject(ToastService);
  private modalSrv = inject(NgbModal);
  private fb = inject(FormBuilder);

  @ViewChild('formModal') formModal!: TemplateRef<any>;

  tipi: TipoBici[] = [];
  loading = true;
  saving = false;
  editingId: number | null = null;

  readonly categorie: { value: CategoriaBici; label: string }[] = [
    { value: 'CITY_BIKE', label: 'City Bike' },
    { value: 'MOUNTAIN_BIKE', label: 'Mountain Bike' },
    { value: 'GRAVEL', label: 'Gravel' },
    { value: 'ROAD_BIKE', label: 'Road Bike' }
  ];
  readonly motorizzazioni: { value: Motorizzazione; label: string }[] = [
    { value: 'NORMALE', label: '💪 Muscolare' },
    { value: 'ELETTRICA', label: '⚡ Elettrica' }
  ];
  readonly taglie: Taglia[] = ['S', 'M', 'L', 'XL'];

  form = this.fb.group({
    categoria: ['CITY_BIKE' as CategoriaBici, Validators.required],
    motorizzazione: ['NORMALE' as Motorizzazione, Validators.required],
    taglia: ['M' as Taglia, Validators.required],
    prezzoMezzaGiornata: [null as number | null, [Validators.required, Validators.min(0.01)]]
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.srv.getAll().subscribe({
      next: data => { this.tipi = data ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openCreate() {
    this.editingId = null;
    this.form.reset({ categoria: 'CITY_BIKE', motorizzazione: 'NORMALE', taglia: 'M', prezzoMezzaGiornata: null });
    this.modalSrv.open(this.formModal, { centered: true });
  }

  openEdit(t: TipoBici) {
    this.editingId = t.id;
    this.form.setValue({
      categoria: t.categoria,
      motorizzazione: t.motorizzazione,
      taglia: t.taglia,
      prezzoMezzaGiornata: Number(t.prezzoMezzaGiornata)
    });
    this.modalSrv.open(this.formModal, { centered: true });
  }

  save(modal: any) {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value;
    const data = {
      categoria: v.categoria as CategoriaBici,
      motorizzazione: v.motorizzazione as Motorizzazione,
      taglia: v.taglia as Taglia,
      prezzoMezzaGiornata: Number(v.prezzoMezzaGiornata)
    };
    const obs = this.editingId ? this.srv.update(this.editingId, data) : this.srv.create(data);
    obs.subscribe({
      next: () => { this.load(); modal.close(); this.saving = false; },
      error: (e) => { this.toastSrv.error(e?.error?.message ?? 'Errore salvataggio'); this.saving = false; }
    });
  }

  onDelete(id: number) {
    if (!confirm('Eliminare questo tipo di bicicletta?')) return;
    this.srv.delete(id).subscribe({
      next: () => { this.load(); },
      error: (e) => { this.toastSrv.error(e?.error?.message ?? 'Errore eliminazione'); }
    });
  }

  categoriaLabel(c: CategoriaBici): string {
    return this.categorie.find(x => x.value === c)?.label ?? c;
  }

  categoriaBadgeClass(c: CategoriaBici): string {
    const map: Record<CategoriaBici, string> = {
      CITY_BIKE: 'badge-city', MOUNTAIN_BIKE: 'badge-mtb',
      GRAVEL: 'badge-gravel', ROAD_BIKE: 'badge-road'
    };
    return map[c] ?? '';
  }
}
