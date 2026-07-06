# Malyte Weekly Dashboard — JSON Schema v1

Contratto dati tra AI/backend e frontend React. Zero HTML, zero styling,
zero logica UI — solo contenuto e flag di visibilità. Pensato per restare
stabile per anni: nuove carte si aggiungono come nuovi campi opzionali,
mai modificando quelli esistenti.

```typescript
interface WeeklyDashboard {
  schema_version: "1.0.0"

  week: {
    number: number              // required, int, backend
    total: number               // required, int, backend (durata programma)
    state: "discover" | "validate" | "adapt"  // required, backend, da checkinCount
  }

  status: {
    label: string                // required, AI reasoning
    // parola-stato breve ("On track", "Building momentum")
    // genera da: ultimo check-in (aderenza + miglioramento riportato)
  }

  coach_note: {
    headline: string             // required
    body: string                 // required, max ~400 char (enforced dal validator)
    // AI reasoning: cita un dato reale dal check-in precedente.
    // week=1 → anticipazione invece di riconoscimento, stesso campo
  }

  progress_trend: {
    visible: boolean             // required, backend (week >= 2)
    label: string | null         // optional, es. "Skin comfort"
    transition: string | null    // optional, es. "Moderate → Mild" — MAI un numero
    direction: "up" | "down" | "stable" | null  // optional, AI reasoning
  }
  // dipendenza: richiede >=2 check-in. week=1 → tutto null, visible=false

  consistency: {
    visible: boolean             // required, backend (week >= 2)
    days_completed: number | null  // optional, backend calcolato, mai da AI
    days_expected: number | null   // optional, backend
    trend_vs_previous: "up" | "down" | "stable" | null  // optional, backend
  }

  ai_observation: {
    visible: boolean              // required, backend (week >= 3)
    text: string | null           // optional, max ~300 char
    // AI reasoning: collega esplicitamente >=2 check-in passati
    // assente prima della week 3 — non forzabile
  }

  weekly_mission: {
    action: string                // required
    why: string                   // required
    // AI reasoning, sempre presente, sempre UNA sola azione (validator enforce)
  }

  routine: {
    morning: RoutineStep[]         // required, array (può essere vuoto)
    evening: RoutineStep[]         // required, array (può essere vuoto)
  }

  milestone: {
    unlocked: boolean              // required, backend (week milestones: 1,4,6,12)
    badge_id: string | null        // optional, backend enum
    title: string | null           // optional
  }

  next_week_preview: {
    text: string                   // required, AI reasoning
    introduces_new_element: boolean  // required, backend (cadenza prodotto)
  }

  safety_flag: {
    active: boolean                // required, backend/AI (da reazione riportata)
    message: string | null         // optional, no medical claims (validator lo controlla)
  }

  checkin: {
    status: "locked" | "available" | "completed"  // required, backend
    opens_at: string | null        // optional, ISO date, backend
    token: string | null           // optional, backend (scheduled_checkins.checkin_token)
  }
}

interface RoutineStep {
  id: string                       // required, uuid, backend/catalog
  product_id: string | null        // optional, null se non da catalogo (es. Practitioner)
  title: string                    // required, AI reasoning / catalog
  instruction: string               // required, AI reasoning
  why: string                       // required, AI reasoning
  step_order: number                // required, backend
}
```

## Regole architetturali applicate
- Zero HTML, zero styling, zero logica UI: solo contenuto e flag booleani.
  Il frontend decide come renderizzare `direction: "up"` (freccia, colore);
  il JSON dice solo il fatto.
- Compatibilità futura: nuove carte = nuovi campi opzionali in cima al livello
  root, mai modifiche a campi esistenti. `schema_version` per migrazioni.
- Content/presentation separati: nessun campo contiene testo pre-formattato
  per la UI (niente markdown, niente simboli decorativi).
- Ogni campo instabile ha `visible`/`null` esplicito invece di essere assente
  silenziosamente — il frontend sa sempre perché qualcosa non c'è.
