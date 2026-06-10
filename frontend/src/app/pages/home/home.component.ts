import { Component, inject } from '@angular/core';
import {AuthService} from "../../services/auth.service";
import {ChartConfiguration, ChartType} from "chart.js";

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  protected authSrv = inject(AuthService);

  user$ = this.authSrv.currentUser$;

  isGraph:boolean = true;

  toggleView() { this.isGraph = !this.isGraph; }

  /** Scroll fluido verso una sezione della pagina (senza reload né salto). */
  scrollTo(sectionId: string, event?: Event) {
    event?.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
  // DATI DI TEST
  public barChartType: ChartType = 'bar';

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  public barChartData: ChartConfiguration['data'] = {
    labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug'],
    datasets: [
      {
        label: 'Vendite',
        data: [65, 59, 80, 81, 56, 55, 40]
      }
    ]
  };

}