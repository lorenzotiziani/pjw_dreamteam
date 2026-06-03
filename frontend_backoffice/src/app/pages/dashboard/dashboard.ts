import { Component, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { catchError, map, of, shareReplay, switchMap } from 'rxjs';

@Component({
    selector: 'app-dashboard',
    standalone: false,
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css'
})
export class DashboardComponent {

    
}
