import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { PuntoVendita, StockBici } from '../entities/punto-vendita.entity';

@Injectable({ providedIn: 'root' })
export class PuntiVenditaService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<any>('/api/punti-vendita/').pipe(map(res => res.data as PuntoVendita[]));
  }

  getById(id: number) {
    return this.http.get<any>(`/api/punti-vendita/${id}`).pipe(map(res => res.data as PuntoVendita));
  }

  create(data: { nome: string; indirizzo: string; citta: string }) {
    return this.http.post<any>('/api/punti-vendita/', data);
  }

  update(id: number, data: { nome?: string; indirizzo?: string; citta?: string; attivo?: boolean }) {
    return this.http.put<any>(`/api/punti-vendita/${id}`, data);
  }

  delete(id: number) {
    return this.http.delete<any>(`/api/punti-vendita/${id}`);
  }

  getStock(id: number) {
    return this.http.get<any>(`/api/punti-vendita/${id}/stock`).pipe(map(res => res.data as StockBici[]));
  }

  createStock(puntoVenditaId: number, data: { tipoBiciId: number; quantitaTotale: number; quantitaManutenzione: number }) {
    return this.http.post<any>(`/api/punti-vendita/${puntoVenditaId}/stock`, data);
  }

  updateStock(puntoVenditaId: number, stockId: number, data: { quantitaTotale?: number; quantitaManutenzione?: number }) {
    return this.http.put<any>(`/api/punti-vendita/${puntoVenditaId}/stock/${stockId}`, data);
  }
}
