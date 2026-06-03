import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { TipoBici, CategoriaBici, Motorizzazione, Taglia } from '../entities/tipo-bici.entity';

@Injectable({ providedIn: 'root' })
export class TipiBiciService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<any>('/api/tipi-bici/').pipe(map(res => res.data as TipoBici[]));
  }

  create(data: { categoria: CategoriaBici; motorizzazione: Motorizzazione; taglia: Taglia; prezzoMezzaGiornata: number }) {
    return this.http.post<any>('/api/tipi-bici/', data);
  }

  update(id: number, data: Partial<{ categoria: CategoriaBici; motorizzazione: Motorizzazione; taglia: Taglia; prezzoMezzaGiornata: number }>) {
    return this.http.put<any>(`/api/tipi-bici/${id}`, data);
  }

  delete(id: number) {
    return this.http.delete<any>(`/api/tipi-bici/${id}`);
  }
}
