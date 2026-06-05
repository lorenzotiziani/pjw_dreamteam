import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'error' | 'success' | 'warn';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts$ = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this._toasts$.asObservable();
  private counter = 0;

  private add(message: string, type: Toast['type'], duration = 5000): void {
    const id = ++this.counter;
    this._toasts$.next([...this._toasts$.value, { id, message, type }]);
    setTimeout(() => this.remove(id), duration);
  }

  error(message: string):   void { this.add(message, 'error'); }
  success(message: string): void { this.add(message, 'success'); }
  warn(message: string):    void { this.add(message, 'warn'); }

  remove(id: number): void {
    this._toasts$.next(this._toasts$.value.filter(t => t.id !== id));
  }
}
