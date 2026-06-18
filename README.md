# 🚲 Sistema di noleggio biciclette

Project Work — sistema completo per il noleggio di biciclette di una catena di punti vendita.
La soluzione è composta da un **backend** con API e persistenza, un **frontend web pubblico**
per gli utenti finali, un'**app mobile** per gli utenti finali e un'**interfaccia di backoffice**
per gli operatori. Tutti i client operano sugli stessi dati attraverso il medesimo backend.

---

## 📑 Indice

- [Architettura](#-architettura)
- [Stack tecnologico](#-stack-tecnologico)
- [Struttura del repository](#-struttura-del-repository)
- [Modello dei dati](#-modello-dei-dati)
- [API del backend](#-api-del-backend)
- [Regole di business e assunzioni](#-regole-di-business-e-assunzioni)
- [Installazione ed esecuzione](#-installazione-ed-esecuzione)
- [Variabili d'ambiente](#-variabili-dambiente)
- [Stato delle funzionalità](#-stato-delle-funzionalità)
- [Evoluzioni future](#-evoluzioni-future)

---

## 🏗 Architettura

Architettura **client-server**: un backend centrale espone un'API REST consumata da tre client
distinti (web pubblico, app mobile, backoffice), che condividono lo stesso modello dati e le
stesse regole di business garantite lato server.

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Frontend web │   │  App mobile  │   │  Backoffice  │
│   (Angular)  │   │              │   │   (Angular)  │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │  REST /api  (JWT)
                   ┌──────▼───────┐
                   │   Backend    │  Express + TypeScript
                   │  routes →    │  + Prisma ORM
                   │  controller →│
                   │  service →   │
                   │  Prisma      │
                   └──────┬───────┘
                          │
                   ┌──────▼───────┐
                   │  PostgreSQL  │
                   └──────────────┘
```

Il backend è organizzato per **moduli di dominio**, ciascuno con la stessa struttura a livelli
`routes → controller → service → (model) → Prisma`. Sono presenti middleware trasversali per
autenticazione (JWT), autorizzazione per ruolo, validazione (Zod) e gestione centralizzata degli
errori.

---

## 🧰 Stack tecnologico

| Componente            | Tecnologie                                                            |
| --------------------- | -------------------------------------------------------------------- |
| **Backend / API**     | Node.js, Express, TypeScript, Prisma ORM 7, PostgreSQL               |
| **Frontend pubblico** | Angular 21, Bootstrap 5, Chart.js                                    |
| **App mobile**        | Client mobile per gli utenti finali                                  |
| **Backoffice**        | Angular 21, Bootstrap 5                                              |
| **Auth & sicurezza**  | JWT (access + refresh), bcrypt, Helmet, CORS                         |
| **Comunicazioni**     | Email transazionali via Mailjet                                      |
| **Job pianificati**   | node-cron (promemoria giornaliero)                                   |

---

## 📂 Struttura del repository

```
pjw_dreamteam/
├── backend/                # API REST (Express + Prisma + PostgreSQL)
│   ├── prisma/
│   │   ├── schema.prisma   # Modello dati
│   │   └── migrations/     # Migrazioni
│   └── src/
│       ├── api/            # Moduli di dominio (auth, prenotazioni, ...)
│       ├── config/         # prisma, jwt, mailSender, cron promemoria
│       ├── middleware/     # auth, role, validate
│       ├── errors/         # Errori custom + handler centralizzato
│       ├── routes.ts       # Router root sotto /api
│       └── server.ts       # Entry point
├── frontend/               # Frontend web pubblico (Angular)
├── frontend_backoffice/    # Backoffice operatori (Angular)
└── postman_collection.json # Collection per testare l'API
```

---

## 🗄 Modello dei dati

| Entità                  | Descrizione                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `TUtente`               | Utenti e operatori. Ruolo `USER` / `OPERATORE` / `ADMIN`, stato attivo, verifica email con token.   |
| `PuntoVendita`          | Punti vendita della catena (nome, indirizzo, città, attivo).                                         |
| `TipoBici`              | Categoria (City/Mountain/Gravel/Road), motorizzazione (normale/elettrica), taglia (S/M/L/XL), prezzo per mezza giornata. |
| `StockBici`             | Disponibilità per punto vendita: quantità totale, attuale e in manutenzione.                         |
| `Accessorio`            | Accessori opzionali (casco, borraccia, porta smartphone, lucchetto, luci). Disponibilità illimitata. |
| `CoperturaAssicurativa` | Coperture opzionali (base, emergenza, kasko).                                                        |
| `Prenotazione`          | Testata ordine: utente, punto vendita, date/ore ritiro e riconsegna, stato, totale.                 |
| `RigaPrenotazione`      | Singola bici prenotata, con eventuale copertura e subtotale.                                         |
| `RigaAccessorio`        | Accessori associati a una riga, con quantità.                                                        |
| `LogPrenotazione`       | Tracciamento operazioni di backoffice (ritiro, riconsegna, danno, ritardo) con operatore e note.    |
| `ViewStatistiche`       | Vista denormalizzata a supporto della reportistica.                                                  |

**Stati prenotazione:** `IN_ATTESA`, `CONFERMATA`, `RITIRATA`, `RESTITUITA`, `CANCELLATA`, `DANNO`, `RITARDO`.

---

## 🔌 API del backend

Tutte le rotte sono montate sotto il prefisso `/api`. Le operazioni sensibili sono protette da JWT
e regolate per ruolo.

| Gruppo            | Endpoint principali                                                                                  | Accesso                              |
| ----------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Auth**          | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` · `GET /auth/verify-email` · `POST /auth/registerOperatore` | Pubblico · operatori solo ADMIN      |
| **Utenti**        | `GET /users/profile` · `PUT /users/change-password` · `DELETE /users/deleteAccount` · `GET /users` · `PATCH /users/:id/status` | Autenticato · lista/stato solo ADMIN |
| **Punti vendita** | `GET/POST/PUT/DELETE /punti-vendita` · stock `/:id/stock`                                            | Lettura libera · scrittura ADMIN/OPERATORE |
| **Catalogo**      | `GET/POST/PUT/DELETE /tipi-bici`, `/accessori`, `/coperture`                                         | Lettura libera · scrittura ADMIN/OPERATORE |
| **Prenotazioni**  | `GET /prenotazioni/mie` · `GET /prenotazioni` · `POST/PUT/DELETE /prenotazioni/:id` · `PATCH /prenotazioni/:id/stato` | Utente per le proprie · tutte: ADMIN/OPERATORE |
| **Log operazioni**| `GET/POST/PUT/DELETE /logOperazioni`                                                                 | ADMIN                                |
| **Statistiche**   | `GET /statistiche` (con filtri)                                                                      | Backoffice                           |

> 💡 La collection [`postman_collection.json`](postman_collection.json) contiene esempi pronti per testare l'API.

---

## ⚙️ Regole di business e assunzioni

- **Tariffa** — il listino definisce il prezzo per **mezza giornata** per tipo di bici. La durata
  è convertita in mezze giornate a blocchi di 6 ore arrotondati per eccesso (`ceil(ore / 6)`).
  Coperture: importo fisso per riga. Accessori: prezzo fisso per quantità, disponibilità illimitata.
- **Disponibilità** — calcolata per punto vendita e tipo bici sullo stock. Prenotazione, riconsegna,
  danno e ritardo aggiornano lo stock in **transazione**, evitando sovra-prenotazioni.
- **Registrazione e verifica** — alla registrazione viene inviata un'email con link di attivazione
  (scadenza 24 h); il login richiede account verificato e attivo.
- **Gestione prenotazioni utente** — modifica e cancellazione consentite **fino a 2 giorni prima**
  della data di ritiro.
- **Pagamento** — effettuato **al punto di noleggio al momento del ritiro** (nessun pagamento online).
- **Notifiche** — promemoria automatico inviato via email il giorno precedente al ritiro (cron).
- **Ruoli** — `USER` (utente finale), `OPERATORE` (gestione operativa), `ADMIN` (configurazione e amministrazione).

---

## 🚀 Installazione ed esecuzione

### Prerequisiti
- Node.js (LTS) e npm
- Istanza PostgreSQL raggiungibile
- Credenziali Mailjet (per l'invio email)

### Backend
```bash
cd backend
npm install
npx prisma migrate deploy      # applica le migrazioni
npm run dev                    # sviluppo (nodemon + ts-node)
# oppure: npm run build && npm start   # produzione
```
API disponibile su `http://localhost:3000/api`.

### Frontend pubblico
```bash
cd frontend
npm install
npm start                      # ng serve → http://localhost:4200
```

### Backoffice
```bash
cd frontend_backoffice
npm install
npm start                      # richiede account OPERATORE o ADMIN
```

> Le chiamate `/api` dei frontend sono inoltrate al backend tramite proxy (`proxy.conf.json`).

---

## 🔐 Variabili d'ambiente

File `backend/.env`:

| Variabile                              | Descrizione                                   |
| -------------------------------------- | --------------------------------------------- |
| `DATABASE_URL`                         | Stringa di connessione PostgreSQL             |
| `JWT_SECRET` / `JWT_REFRESH_SECRET`    | Segreti per la firma dei token                |
| `MJ_APIKEY_PUBLIC` / `MJ_APIKEY_PRIVATE` | Chiavi API Mailjet                          |
| `FRONTEND_URL`                         | URL del frontend per i link di verifica email |
| `PORT`                                 | Porta del server (default `3000`)             |

---

## ✅ Stato delle funzionalità

| Funzionalità                                                  | Stato                          |
| ------------------------------------------------------------ | ------------------------------ |
| Catalogo (punti vendita, tipi bici, accessori, coperture)    | ✅ Implementata                 |
| Disponibilità e calcolo tariffa                              | ✅ Implementata                 |
| Form di prenotazione multi-bici                              | ✅ Implementata                 |
| Registrazione + verifica email                               | ✅ Implementata                 |
| Conferma prenotazione + email riepilogativa                  | ✅ Implementata                 |
| Gestione proprie prenotazioni (limite 2 giorni)              | ✅ Implementata                 |
| Promemoria giorno precedente (cron + email)                  | ✅ Implementata                 |
| Backoffice: dati base, prenotazioni, ritiro/riconsegna, stock| ✅ Implementata                 |
| Backoffice: statistiche e gestione operatori                 | ✅ Implementata                 |
| Pagamento al ritiro                                          | 🟡 Gestito offline             |
| Pagamento online                                             | ⚪ Evoluzione futura            |
| Funzioni native mobile (geoloc., push, fotocamera)           | ⚪ Evoluzione futura            |

---

## 🔭 Evoluzioni future

- Integrazione di un sistema di **pagamento online**.
- Funzionalità **native** dell'app mobile (geolocalizzazione punti vendita, notifiche push, fotocamera, offline).
- **Cruscotti** di reportistica più evoluti e indicatori a supporto delle decisioni operative.
- Tracciamento amministrativo più esteso delle operazioni e gestione avanzata degli account operatore.

---

_Team **DreamTeam** — 2026_
