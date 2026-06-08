import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LogicaService {

  generaOrariDisponibili(startHour: number = 9, endHour: number = 18): string[] {
    const orari: string[] = [];
    for (let ora = startHour; ora < endHour; ora++) {
      orari.push(`${ora.toString().padStart(2, '0')}:00 - ${(ora + 1).toString().padStart(2, '0')}:00`);
    }
    return orari;
  }

  generaOrariRiconsegna(oraRitiroFascia: string, endHour: number = 18): string[] {
    if (!oraRitiroFascia) return [];
    const fineRitiro = oraRitiroFascia.split(' - ')[1];
    const oraFine = parseInt(fineRitiro.split(':')[0]);
    const orari: string[] = [];
    for (let ora = oraFine; ora < endHour; ora++) {
      orari.push(`${ora.toString().padStart(2, '0')}:00 - ${(ora + 1).toString().padStart(2, '0')}:00`);
    }
    return orari;
  }


  estraiOraInizioDaFascia(fascia: string): string {
    return fascia.split(' - ')[0]; // es. "09:00"
  }

  estraiOraFineDaFascia(fascia: string): string {
    return fascia.split(' - ')[1]; // es. "10:00"
  }

  // Converte "09:00" in oggetto { ore: 9, minuti: 0 }
  estraiOreMinuti(oraString: string): { ore: number; minuti: number } {
    const [ore, minuti] = oraString.split(':').map(Number);
    return { ore, minuti };
  }

  // Converte una fascia "09:00 - 10:00" in "09:00:00"
  fasciaToOraTime(fascia: string): string {
    const inizio = this.estraiOraInizioDaFascia(fascia);
    return `${inizio}:00`;
  }

  // Converte una fascia in un oggetto Date (data base + ora)
  fasciaToDate(dataBase: Date, fascia: string): Date {
    const { ore, minuti } = this.estraiOreMinuti(this.estraiOraInizioDaFascia(fascia));
    const result = new Date(dataBase);
    result.setHours(ore, minuti, 0, 0);
    return result;
  }


  formatDateToYYYYMMDD(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  formatTimeToHHMMSS(date: Date): string {
    const ore = date.getHours().toString().padStart(2, '0');
    const minuti = date.getMinutes().toString().padStart(2, '0');
    return `${ore}:${minuti}:00`;
  }

  formatDateTimeToBackend(datetime: Date): string {
    // Esempio: "2025-06-10T18:00:00" (senza millisecondi, senza Z)
    return datetime.toISOString().replace('Z', '').slice(0, 19);
  }


  calcolaTotale(prezzoBici: number, prezzoCopertura: number = 0, prezziAccessori: number[] = []): number {
    let totale = prezzoBici;
    totale += prezzoCopertura;
    totale += prezziAccessori.reduce((sum, p) => sum + p, 0);
    return totale;
  }


  // Data una prenotazione dal backend, restituisce i valori pronti per un form di modifica
  preparaFormModifica(prenotazione: any): any {
    const dataRitiro = prenotazione.dataRitiro?.split('T')[0];
    const oraRitiroFascia = this.formatOraInFascia(prenotazione.oraRitiro);
    const oraRiconsegnaFascia = this.formatDateTimeToFascia(prenotazione.dataOraRiconsegna);
    return {
      dataRitiro,
      puntoVenditaId: prenotazione.puntoVenditaId,
      oraRitiro: oraRitiroFascia,
      oraRiconsegna: oraRiconsegnaFascia,
      tipoBiciId: prenotazione.righe?.[0]?.tipoBiciId,
      coperturaId: prenotazione.righe?.[0]?.coperturaId,
      accessoriIds: prenotazione.righe?.[0]?.accessori?.map((a: any) => a.accessorioId) || []
    };
  }

  isDataRiconsegnaValida(dataRitiro: string, dataRiconsegna: string): boolean {
  const ritiro = new Date(dataRitiro);
  const riconsegna = new Date(dataRiconsegna);
  return riconsegna >= ritiro;
}

  formatOraInFascia(oraTime: string): string {
    if (!oraTime) return '';
    const hour = parseInt(oraTime.split(':')[0]);
    return `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`;
  }

  formatDateTimeToFascia(datetime: string): string {
    if (!datetime) return '';
    const date = new Date(datetime);
    const hour = date.getHours();
    return `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`;
  }

  // Estrae l'orario "HH:MM:SS" da una stringa ISO (es. "1970-01-01T11:00:00.000Z" → "11:00:00")
  extractTimeFromISO(isoString: string): string {
    if (!isoString) return '';
    return isoString.split('T')[1].split('.')[0];
  }

  // Converte "HH:MM:SS" in fascia "HH:00 - HH+1:00"
  formatOraInFasciaFromTime(timeStr: string): string {
    const hour = parseInt(timeStr.split(':')[0]);
    return `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`;
  }


  public isModificaConsentita(dataRitiro: string | null | undefined ): boolean {
    if (!dataRitiro) return false;
    // Parse della data come UTC (YYYY-MM-DD)
    const oggi = new Date();
    oggi.setUTCHours(0, 0, 0, 0);
    const ritiro = new Date(dataRitiro);
    ritiro.setUTCHours(0, 0, 0, 0);
    const diffMs = ritiro.getTime() - oggi.getTime();
    const diffGiorni = diffMs / (1000 * 60 * 60 * 24);
    // Mostra i pulsanti solo se mancano più di 2 giorni
    console.log('dataRitiro:', dataRitiro, 'diffGiorni:', diffGiorni, 'consentita:', diffGiorni > 2);
    return diffGiorni > 2;
  }

}