import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { LogOperazione } from '../entities/log-operazione.entity';

@Injectable({ providedIn: 'root' })
export class LogOperazioniService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<any>('/api/logOperazioni').pipe(
      map(res => (res?.data ?? []) as LogOperazione[])
    );
  }
}
