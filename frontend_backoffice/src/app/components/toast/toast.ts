import { Component, inject } from '@angular/core';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: false,
  templateUrl: './toast.html',
  styleUrl:    './toast.css'
})
export class ToastComponent {
  private toastSrv = inject(ToastService);
  readonly toasts$ = this.toastSrv.toasts$;

  remove(id: number): void {
    this.toastSrv.remove(id);
  }

  iconFor(type: Toast['type']): string {
    if (type === 'error')   return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
    if (type === 'success') return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
    return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
  }
}
