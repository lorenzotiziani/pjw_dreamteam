import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-edit-booking',
  standalone: false,
  templateUrl: './edit-booking.component.html',
  styleUrl: './edit-booking.component.css',
})
export class EditBookingComponent {
  protected fb = inject(FormBuilder);
  protected modal = inject(NgbActiveModal);

  sessionForm = this.fb.group({
    title: ['', {validators: [Validators.required]}],
    startsAt: ['', {validators: [Validators.required]}],
    durationMinutes: ['', {validators: [Validators.required]}],
    maxParticipants: ['', {validators: [Validators.required]}],
  });

  closeModal() {
    if (this.sessionForm.valid) {
      const formValue = {
        ...this.sessionForm.value
      };

      this.modal.close(formValue);
      this.sessionForm.reset();
      this.sessionForm.markAsPristine();
    } else {
      this.sessionForm.markAllAsTouched();
    }
  }

  dismissModal() {
    this.sessionForm.reset();
    this.sessionForm.markAsPristine();
    this.modal.dismiss()
  }
}
