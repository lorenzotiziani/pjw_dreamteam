import { Injectable, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmModalComponent } from '../components/confirm-modal/confirm-modal.component';

export interface ConfirmOptions {
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'primary';
}

@Injectable({ providedIn: 'root' })
export class ConfirmModalService {
  private modalSrv = inject(NgbModal);

  /** Apre un dialog di conferma e risolve true (conferma) o false (annulla). */
  confirm(options: ConfirmOptions): Promise<boolean> {
    const ref = this.modalSrv.open(ConfirmModalComponent, {
      centered: true,
      size: 'sm',
      backdrop: 'static',
      keyboard: true
    });
    const c = ref.componentInstance as ConfirmModalComponent;
    c.title        = options.title;
    c.message      = options.message;
    c.detail       = options.detail ?? '';
    c.confirmLabel = options.confirmLabel ?? 'Conferma';
    c.cancelLabel  = options.cancelLabel  ?? 'Annulla';
    c.type         = options.type ?? 'danger';
    return ref.result.then(() => true, () => false);
  }
}
