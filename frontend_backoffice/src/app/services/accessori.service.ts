import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { Accessorio } from '../entities/accessorio.entity';

@Injectable({ providedIn: 'root' })
export class AccessoriService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<any>('/api/accessori/').pipe(map(res => res.data as Accessorio[]));
  }

  create(data: { nome: string; prezzo: number }) {
    return this.http.post<any>('/api/accessori/', data);
  }

  update(id: number, data: { nome?: string; prezzo?: number }) {
    return this.http.put<any>(`/api/accessori/${id}`, data);
  }

  delete(id: number) {
    return this.http.delete<any>(`/api/accessori/${id}`);
  }
}
