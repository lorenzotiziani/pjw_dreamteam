import { Component, inject } from '@angular/core';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: false,
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css'
})
export class ToastComponent {
  private toastSrv = inject(ToastService);
  readonly toasts$ = this.toastSrv.toasts$;

  remove(id: number): void {
    this.toastSrv.remove(id);
  }

  /** Classe Bootstrap Icon in base al tipo di toast. */
  iconFor(type: Toast['type']): string {
    switch (type) {
      case 'success': return 'bi-check-circle-fill';
      case 'error':   return 'bi-x-circle-fill';
      case 'warn':    return 'bi-exclamation-triangle-fill';
      default:        return 'bi-info-circle-fill';
    }
  }
}
