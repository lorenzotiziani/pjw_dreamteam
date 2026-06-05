import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { Accessorio } from '../entities/Accessorio';
import { ApiResponse } from './response';

@Injectable({
  providedIn: 'root',
})
export class AccessorioService {
  protected http = inject(HttpClient);

  protected _accessorio$ = new BehaviorSubject<Accessorio[]>([]);

  accessorio$ = this._accessorio$.asObservable();

  constructor(){
    this.fetch()
  }
  
  fetch(){
    return this.http.get<ApiResponse<Accessorio[]>>(`/api/accessori`)
    .pipe(map(response => response.data))
    .subscribe(accessori => this._accessorio$.next(accessori));
  }
}
