import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-confirm-modal',
  standalone: false,
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.css'
})
export class ConfirmModalComponent {
  @Input() title        = 'Conferma';
  @Input() message      = '';
  @Input() detail       = '';
  @Input() confirmLabel = 'Conferma';
  @Input() cancelLabel  = 'Annulla';
  @Input() type: 'danger' | 'warning' | 'primary' = 'danger';

  constructor(public activeModal: NgbActiveModal) {}
}
