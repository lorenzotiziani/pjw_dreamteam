import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CoperatureService } from '../../services/coperture.service';
import { Copertura } from '../../entities/copertura.entity';

@Component({
  selector: 'app-coperture',
  standalone: false,
  templateUrl: './coperture.html',
  styleUrl: './coperture.css'
})
export class CoperatureComponent implements OnInit {
  private srv = inject(CoperatureService);
  private modalSrv = inject(NgbModal);
  private fb = inject(FormBuilder);

  @ViewChild('formModal') formModal!: TemplateRef<any>;

  coperture: Copertura[] = [];
  loading = true;
  saving = false;
  errorMsg = '';
  editingId: number | null = null;

  form = this.fb.group({
    nome: ['', Validators.required],
    descrizione: ['', Validators.required],
    prezzo: [null as number | null, [Validators.required, Validators.min(0)]]
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.srv.getAll().subscribe({
      next: data => { this.coperture = data ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openCreate() {
    this.editingId = null;
    this.form.reset({ nome: '', descrizione: '', prezzo: null });
    this.modalSrv.open(this.formModal, { centered: true });
  }

  openEdit(c: Copertura) {
    this.editingId = c.id;
    this.form.setValue({ nome: c.nome, descrizione: c.descrizione, prezzo: Number(c.prezzo) });
    this.modalSrv.open(this.formModal, { centered: true });
  }

  save(modal: any) {
    if (this.form.invalid) return;
    this.saving = true;
    const data = {
      nome: this.form.value.nome!,
      descrizione: this.form.value.descrizione!,
      prezzo: Number(this.form.value.prezzo)
    };
    const obs = this.editingId ? this.srv.update(this.editingId, data) : this.srv.create(data);
    obs.subscribe({
      next: () => { this.load(); modal.close(); this.saving = false; },
      error: (e) => { this.errorMsg = e?.error?.message ?? 'Errore salvataggio'; this.saving = false; }
    });
  }

  onDelete(id: number) {
    if (!confirm('Eliminare questa copertura assicurativa?')) return;
    this.srv.delete(id).subscribe({
      next: () => { this.load(); },
      error: (e) => { this.errorMsg = e?.error?.message ?? 'Errore eliminazione'; }
    });
  }
}
