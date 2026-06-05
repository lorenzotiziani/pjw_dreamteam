import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AccessoriService } from '../../services/accessori.service';
import { ToastService } from '../../services/toast.service';
import { Accessorio } from '../../entities/accessorio.entity';

@Component({
  selector: 'app-accessori',
  standalone: false,
  templateUrl: './accessori.html',
  styleUrl: './accessori.css'
})
export class AccessoriComponent implements OnInit {
  private srv = inject(AccessoriService);
  private toastSrv = inject(ToastService);
  private modalSrv = inject(NgbModal);
  private fb = inject(FormBuilder);

  @ViewChild('formModal') formModal!: TemplateRef<any>;

  accessori: Accessorio[] = [];
  loading = true;
  saving = false;
  editingId: number | null = null;

  form = this.fb.group({
    nome: ['', Validators.required],
    prezzo: [null as number | null, [Validators.required, Validators.min(0)]]
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.srv.getAll().subscribe({
      next: data => { this.accessori = data ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openCreate() {
    this.editingId = null;
    this.form.reset({ nome: '', prezzo: null });
    this.modalSrv.open(this.formModal, { centered: true });
  }

  openEdit(a: Accessorio) {
    this.editingId = a.id;
    this.form.setValue({ nome: a.nome, prezzo: Number(a.prezzo) });
    this.modalSrv.open(this.formModal, { centered: true });
  }

  save(modal: any) {
    if (this.form.invalid) return;
    this.saving = true;
    const data = { nome: this.form.value.nome!, prezzo: Number(this.form.value.prezzo) };
    const obs = this.editingId ? this.srv.update(this.editingId, data) : this.srv.create(data);
    obs.subscribe({
      next: () => { this.load(); modal.close(); this.saving = false; },
      error: (e) => { this.toastSrv.error(e?.error?.message ?? 'Errore salvataggio'); this.saving = false; }
    });
  }

  onDelete(id: number) {
    if (!confirm('Eliminare questo accessorio?')) return;
    this.srv.delete(id).subscribe({
      next: () => { this.load(); },
      error: (e) => { this.toastSrv.error(e?.error?.message ?? 'Errore eliminazione'); }
    });
  }
}
