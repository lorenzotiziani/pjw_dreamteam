import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-confirm-modal',
  standalone: false,
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.css'
})
export class ConfirmModalComponent {
  @Input() title        = 'Conferma';
  @Input() message      = '';
  @Input() detail       = '';
  @Input() confirmLabel = 'Conferma';
  @Input() cancelLabel  = 'Annulla';
  @Input() type: 'danger' | 'warning' | 'primary' = 'danger';

  constructor(public activeModal: NgbActiveModal) {}

  /** Icona Bootstrap in base al tipo. */
  get icon(): string {
    switch (this.type) {
      case 'warning': return 'bi-exclamation-triangle-fill';
      case 'primary': return 'bi-info-circle-fill';
      default:        return 'bi-trash3-fill';
    }
  }
}
