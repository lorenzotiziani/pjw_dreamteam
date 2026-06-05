import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { Copertura } from '../entities/copertura.entity';

@Injectable({ providedIn: 'root' })
export class CoperatureService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<any>('/api/coperture/').pipe(map(res => res.data as Copertura[]));
  }

  create(data: { nome: string; descrizione: string; prezzo: number }) {
    return this.http.post<any>('/api/coperture/', data);
  }

  update(id: number, data: { nome?: string; descrizione?: string; prezzo?: number }) {
    return this.http.put<any>(`/api/coperture/${id}`, data);
  }

  delete(id: number) {
    return this.http.delete<any>(`/api/coperture/${id}`);
  }
}
