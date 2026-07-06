# MALYTE — Project Brief Unificato

*Documento di sintesi, riorganizzato per argomento dallo storico completo delle sessioni.
Sostituisce la lettura cronologica: qui trovi lo stato attuale e le decisioni finali,
non i passaggi intermedi superati. Per il codice esatto, il repo resta la fonte di verità.*

---

## 1. COS'È MALYTE

Piattaforma B2B AI-powered post-purchase wellness per brand Shopify (skincare, supplementi,
fitness, nutrizione). Il brand installa l'app, i suoi clienti ricevono routine settimanali
personalizzate generate da AI, che si adattano nel tempo tramite check-in.

**Fondatori:** Poul (banking consultant di background) + un co-founder.
**Stack:** Next.js, Supabase, Vercel, Anthropic API, Resend.
**Repo:** github.com/Poulmalyte/malyte-mvp — **nota:** il repository si è spostato,
la URL corrente è `https://github.com/PoulMalyte/malyte-mvp.git` (git lo segnala ad ogni push).
**Live:** app.malyte.com

**Origine storica:** nato come "Adaptfy", marketplace B2C (esperti wellness ↔ clienti).
Pivotato a B2B Shopify a maggio 2024. Il marketplace originale è in standby, ma buona parte
del suo codice legacy (`app/(expert)/`, `app/(client)/`, tabelle `products`, `experts`,
`client_plans`) convive ancora nel repo e in alcuni punti si intreccia col codice Shopify
attuale — fonte di diversi bug scoperti in questa sessione (vedi sezione 6).

**Visione a lungo termine:** "Bloomberg del wellness" — piattaforma di intelligence sui dati
comportamentali (correlazioni prodotto→risultato), con API pubblica in futuro.

---

## 2. STATO DEL BUSINESS — SHOPIFY APP STORE

- Solo il **seller type "Brand"** è attivo. Practitioner e PDF Seller sono stati **nascosti**
  dall'onboarding (non rimossi dal codice — dormienti) il 25 giugno. `seller_type='brand'`
  forzato. Il Brand genera routine dai **prodotti acquistati dal catalogo**, mai da PDF/metodologia.
- App sospesa da Shopify per requisito 2.1.1 a giugno, poi risolta: RLS mancanti su
  `shopify_products`, bug di `submit-checkin` che scriveva settimane nel posto sbagliato,
  formato `customer_questions` non conforme.
- **Fix critico pre-produzione, ancora da fare:** impostare `SHOPIFY_BILLING_TEST=false` su
  Vercel prima che entrino i primi merchant paganti reali.
- Flusso di installazione validato end-to-end su due percorsi: App Store install e
  connessione manuale (registrazione diretta + Connect Shopify) — entrambi funzionanti.
- Token refresh automatico Shopify implementato e verificato (`lib/shopify-token.ts`,
  `getValidAccessToken(shop)`), token scaduti gestiti correttamente.

---

## 3. ARCHITETTURA DATI — TABELLE PRINCIPALI (mondo Shopify/Brand attivo)

| Tabella | Ruolo |
|---|---|
| `merchants` | Il brand. **`id` e `expert_id` sono sempre lo stesso valore** (verificato su campione). |
| `merchant_profiles` | Filosofia, tono di voce, ingredienti da evitare/preferire, **`customer_questions`** (quiz del merchant, formato `{id, text, type, options, enabled}` — **NON** `question_text`/`question_type`, quello è un formato diverso usato altrove). |
| `shopify_installations` | Collega merchant ↔ shop Shopify (`shop_domain`), via `expert_id`. |
| `catalog_items` + `catalog_item_tags` | Catalogo prodotti del merchant, con tag (`routine_step`, `usage_time`, `objective`, `hero_ingredient`, `contraindication`, **`intro_week`** — quando un prodotto può essere introdotto in cross-sell). |
| `shopify_products` | Prodotti Shopify sincronizzati (prezzo, variant_id, url), collegati a `catalog_items`. Ha anche `questions` (altro formato quiz, usato dal flusso legacy per-prodotto — **non** quello del nuovo journey). |
| `shopify_orders` | Ordine Shopify, con `token`, `status` (usato per il flusso legacy `generate-plan`). |
| `customers` | Cliente per email (mondo nuovo Brand). |
| `merchant_customers` | Collega merchant ↔ customer. |
| `customer_profiles` | Risposte quiz del cliente per quel merchant (`quiz_answers`, con campo `version`). |
| `brand_plans` | Il piano settimanale — `token`, `customer_id`, `merchant_id`, `week_number`, `plan_data`, `package_data` (bundle — **da rimuovere dal journey**, vedi sezione 7), `customer_summary`. |
| `brand_checkin_events` | **Creata in questa sessione.** Storico reale dei check-in — `brand_plan_id`, `customer_id`, `merchant_id`, `week_number`, `answers` (JSONB, risposte grezze), `adherence_score`, `improvement_score`, `had_reaction`, `reaction_detail`, `comment`. RLS con policy SELECT verificata. |
| `scheduled_checkins` | Check-in programmati — `checkin_token` (usato per l'URL `/checkin/[token]`), `status` (pending/completed), `scheduled_for`. |

**Tabelle morte/rotte, da NON usare:**
- `checkin_events` — punta a `plans`/`plan_versions`, entrambe **vuote da sempre**. Ogni insert falliva silenziosamente. Sostituita da `brand_checkin_events`.
- `plans`, `plan_versions` — residui di un design mai completato, 0 righe, ignorare.

**Tech debt noto e documentato — frammentazione domande quiz:**
Le buyer questions esistono in **tre modelli dati distinti** che non si sincronizzano:
`product_questions` (legacy), `shopify_products.questions` (letto da `generate-plan`),
`merchant_profiles.customer_questions` (letto dal nuovo journey `StartClient.tsx` e da
`order-followup`). Il seller-bridge sincronizza solo `product_questions → merchant_profiles`,
non nelle altre direzioni. Da consolidare post-scaling, non urgente per il journey nuovo
(che usa già la sede corretta, `merchant_profiles.customer_questions`).

---

## 4. IL LOOP SETTIMANALE (check-in) — CORRETTO, VALIDATO, NON TOCCARE SENZA MOTIVO

**Route chiave (nomi fuorvianti, verificato dal codice):**
- **`generate-plan-and-bundle`** — genera il **primo** piano (Week 1), oggi fuso col bundle (vedi sezione 7, da correggere).
- **`generate-followup-plan`** — nome fuorviante: genera **anche lui solo la Week 1**, ramo alternativo/legacy.
- **`submit-checkin`** — genera **tutte le settimane successive** (2, 3, ... 12). Il vero motore del loop.

**`submit-checkin` — stato attuale, corretto:**
- Calcola `weekState` (discover/validate/adapt) contando righe in `brand_checkin_events` per
  (customer_id, merchant_id): 0→discover, 1→validate, 2+→adapt. Passato nel prompt come riga
  informativa "Data state: X", **non ancora usato per cambiare il comportamento del prompt**
  (Step 3 di un piano di integrazione più ampio, completato solo in parte — vedi sezione 8).
- **7 regole hard nel systemPrompt** (righe ~153-160): solo prodotti dal catalogo, routine
  costruita sui prodotti già in uso, gestione reazioni (rimuovi non aggiungere), cross-sell
  max 1 prodotto/ciclo solo se `intro_week === nextWeek`, **no claim medici** (regola 5,
  aggiunta in questa sessione), **no ri-presentazione del profilo** (regola 6, aggiunta),
  return JSON puro.
- **Bug risolto — "trascinamento Week 1":** `package_data` (starter bundle) e
  `customer_summary` (profilo) venivano copiati da `brand_plans` in ogni settimana successiva,
  quindi lo starter bundle e la frase "you have dry skin, ideal candidate for..." comparivano
  anche a Week 10. Fix: `package_data: null` per week>1 in `submit-checkin`; rendering di
  `customer_summary` in `/routine/[token]/page.tsx` condizionato a `week_number === 1`.
  Verificato end-to-end: piano Week 7 pulito, nessun bundle, nessuna ri-presentazione.

---

## 5. DASHBOARD V2 — REDESIGN VISIVO (in produzione, componenti congelati)

**Design (non più da modificare senza richiesta esplicita):**
- `docs/dashboard-design/malyte-dashboard-01-architecture.md` — 11 carte, category-agnostic
  (Status Ring, Coach Note, Progress Trend, Weekly Mission, Routine Cards, Consistency,
  AI Observations, Milestones, Next Week Preview, Safety Flag, Check-in CTA).
- `-02-visual-spec.md` — palette, tipografia, animazioni (stile calmo, Apple-like).
- `-03-json-schema.md` — contratto dati v1.0.0 (content/presentation separati).
- `lib/dashboard/malyte-dashboard-prompt.ts` — prompt di produzione per generare quel JSON
  (rispetta le stesse regole hard: no claim medici, no numeri finti, DISCOVER/VALIDATE/ADAPT).
  **Non ancora collegato a `submit-checkin` in produzione** — gira solo in uno script di
  verifica standalone.

**Componenti implementati in `app/routine/[token]/page.tsx` (5, tutti congelati):**
1. **Status Ring** — anello SVG, `week_number`/`TEMP_TOTAL_WEEKS` (hardcoded a 12, da rendere
   dinamico in futuro), niente animazioni per scelta esplicita.
2. **Coach Note** — Hero + Weekly notes uniti in una carta bianca centrata con avatar.
3. **Next Week Preview** — da verde acceso a palette neutra spenta.
4. **Evolution** — box di chiusura, simbolo ∞, palette neutra.
5. **Starter Bundle** — restilizzato (bordo sottile) **ma concettualmente da rimuovere da
   questa pagina**, vedi sezione 7.

**Metodo seguito per ogni componente (da ripetere per i prossimi):** ispeziona codice
esistente → proponi il cambiamento minimo → attendi conferma esplicita → patch isolata
→ `tsc --noEmit` → `git diff` (deve mostrare solo righe additive/isolate) → deploy →
verifica visiva reale su un piano esistente. Mai riscritture, mai più sottosistemi insieme.

**Ancora da fare:** Routine Cards con tap-to-expand (richiede stato client, l'unico pezzo
rimasto "solo presentazione" prima di introdurlo — deliberatamente lasciato per ultimo).

---

## 6. BUG STRUTTURALI SCOPERTI E RISOLTI IN QUESTA SESSIONE

1. **RLS mancante su UPDATE `shopify_products`** — il Save prodotto dal browser tornava 204
   ma non scriveva (RLS attivo, zero policy UPDATE). Confermato con service-role vs anon key.
   **Fix:** policy `"user updates own shop products"` aggiunta via SQL Editor Supabase,
   ricalcata sulla condizione della SELECT esistente. Confermato con test reale dal browser.

2. **`checkin_events` mai scritta da sempre** — foreign key verso `plans`/`plan_versions`
   (tabelle vuote, mai implementate). **Fix:** nuova tabella `brand_checkin_events`, FK
   corrette verso `brand_plans`/`customers`/`merchants` (tutte verificate esistenti/popolate).

3. **Trascinamento bundle/profilo oltre Week 1** — vedi sezione 4.

4. **Mismatch formato domande quiz** — `merchant_profiles.customer_questions` deve usare
   `{id, text, type, options, enabled}`, non `{question_text, question_type}` (altro formato,
   usato da `shopify_products.questions`). Sbagliare formato → quiz vuoto silenziosamente.

**Metodo che ha permesso di trovarli:** mai fidarsi del nome di un file o di un'assunzione;
verificare con query di sola lettura prima di scrivere; distinguere sempre "requisito di
prodotto" da "assunzione tecnica"; un errore/anomalia va isolato e capito, non ignorato.

---

## 7. CORREZIONE ARCHITETTURALE MAGGIORE — IL JOURNEY DI ONBOARDING (in corso, non completata)

**Il problema scoperto:** la routine Week 1 mostra oggi il bundle di partenza **come se il
cliente lo stesse ancora comprando**, dentro la stessa pagina che dovrebbe mostrare solo la
routine. Causa radice, verificata dal codice (`generate-plan-and-bundle/route.ts`):

- **Un'unica chiamata AI** genera piano e bundle insieme (prompt: *"Create a personalized
  Week 1 plan and starter bundle"*), con `plan` e `package` come chiavi sorelle nello stesso JSON.
- **Un unico insert** in `brand_plans` scrive `plan_data` e `package_data` sulla stessa riga.
- **L'email con il link al piano viene inviata subito**, prima che qualsiasi acquisto sia
  verificato — il sistema non legge né verifica mai un ordine Shopify in questo intero file.

**Il journey corretto, congelato come requisito di prodotto fisso:**
```
Quiz (del merchant, già esiste — merchant_profiles.customer_questions)
  → AI analizza le risposte
  → AI raccomanda prodotti SOLO dal catalogo di quel merchant
  → Cliente acquista i prodotti raccomandati
  → SOLO DOPO l'acquisto, si genera la Week 1, usando SOLO i prodotti realmente acquistati
  → Weekly check-in loop (già corretto, invariato)
```

**Architettura a 7 servizi (congelata):** Quiz Configuration, Quiz Response Collection,
Recommendation (con candidate selection interna, produce uno **Recommendation Snapshot
immutabile**), Purchase Confirmation (confronta l'acquisto contro lo snapshot, mai contro
il catalogo live — protegge da modifiche future al catalogo), Week 1 Generation (usa quiz
+ metodologia + prodotti acquistati come **vincolo**, non unico input), Routine Delivery
(guardiano di stato — non mostra nulla se l'acquisto non è confermato), Weekly Check-in
(invariato).

**Mappatura sul codice reale (regola: riusare prima di creare, verificato non presunto):**

- **Quiz Configuration Service** — già esiste, completo: `QuestionBuilder` in
  `ShopifyDashboard.tsx` (istanza `brandQuestions`) → salva `merchant_profiles.customer_questions`.
  Campo `enabled` esiste già e viene validato attivamente lato client. **Nessun gap.**

- **Quiz Response Collection Service** — già esiste: `app/start/[slug]/page.tsx` (risolve
  merchant per slug, richiede `is_published=true`) → `StartClient.tsx` (raccoglie risposte in
  stato locale, valida `enabled` prima del submit, blocca se mancano risposte). **Gap minore:**
  nessuna persistenza incrementale (se il cliente abbandona, perde tutto). **Gap reale:**
  nessuna validazione lato server della completezza — il backend si fida ciecamente di
  `quiz_answers`.

- **Recommendation Service** — **qui vive il problema**, fuso con Week 1 Generation dentro
  `generate-plan-and-bundle/route.ts`. Refactoring in corso (vedi sezione 8).

**Piano di migrazione (10 fasi, congelato, principio: mai rompere il flusso attuale finché
il nuovo non è pronto):** Fase 0 (instrumentazione) → Fase 1 (stato intermedio sul record
esistente) → Fase 2 (nuovo endpoint raccomandazione, in parallelo) → Fase 3 (nuovo endpoint
Week 1 post-acquisto) → Fase 4 (collegare webhook acquisto reale) → Fase 5 (guardiano in
modalità osservazione) → Fase 6 (instradare un merchant di test sul nuovo percorso) →
Fase 7 (guardiano restrittivo, solo nuovo percorso) → Fase 8 (espansione graduale) →
Fase 9 (rimozione codice vecchio, solo a fine migrazione).

---

## 8. STATO DELL'IMPLEMENTAZIONE DELLA MIGRAZIONE (a oggi)

**Regola guida:** ogni passo deve essere un refactor puro o un'aggiunta isolata — mai
toccare comportamento esistente finché il nuovo percorso non è pronto e verificato.

**Fatto:**
1. ✅ **`lib/shopify-catalog.ts` creato.** Contiene `loadMerchantAndProductsContext(supabaseAdmin, merchant_id)`
   — estratta identica da `generate-plan-and-bundle` (righe 42-97 originali), carica merchant/
   profilo/installazione/catalogo e costruisce `productsContext` con tag. Riusabile da qualunque
   route futura.
2. ✅ **`resolveAndSaveCustomer(supabaseAdmin, merchant_id, customer_email, quiz_answers)`**
   aggiunta allo stesso file — estratta identica (righe 159-189 originali), risolve/crea
   customer, collega merchant↔customer, salva `customer_profiles`.
3. ✅ **`generate-plan-and-bundle/route.ts` refactorizzato** per usare entrambe le funzioni
   estratte al posto del codice inline. **Comportamento verificato identico** (tsc pulito,
   `git diff` isolato riga per riga, nessuna logica cambiata — solo spostamento di codice).
   Due commit separati, entrambi deployati verdi.
4. **In corso:** `app/api/shopify/generate-recommendation/route.ts` — nuovo endpoint isolato,
   NON collegato a nessun frontend, che riusa le due funzioni estratte con un prompt ristretto
   alla sola raccomandazione (`customer_analysis`, `reasoning`, `recommended_products` con
   `why` per ciascuno, `warnings`). Non genera `plan`, non scrive `brand_plans`, non invia
   email, non crea `scheduled_checkins`. Ultima azione: scritto il file, verifica `tsc` in
   sospeso al momento della sospensione di questa nota.

**Da fare (prossimi passi, in ordine):**
- Verificare `tsc --noEmit` sul nuovo endpoint e correggere eventuali errori.
- Testarlo con uno script isolato (stesso pattern degli script standalone già usati: sola
  lettura sul catalogo, chiamata reale con un `merchant_id` di test, verifica del JSON restituito).
- Introdurre lo stato intermedio (Fase 1 del piano) — probabilmente un valore in più su un
  campo di stato esistente, non una nuova tabella (da verificare qual è il candidato giusto,
  es. su `brand_plans` o su una tabella collegata al `customer_profiles`/quiz).
- Costruire il Week 1 Generation Service separato (Fase 3), che genera la routine SOLO dopo
  conferma d'acquisto, usando quiz+metodologia+prodotti posseduti come vincolo.
- Collegare un evento di acquisto reale (Fase 4) — probabilmente riusando meccanismi webhook
  Shopify già esistenti nel progetto, da individuare.
- Guardiano su `/routine/[token]/page.tsx` (Fase 5, poi 7) — non mostrare nulla se lo stato
  non conferma l'acquisto.
- Solo a migrazione conclusa: rimuovere `generate-plan-and-bundle` come codice morto (Fase 9).

---

## 9. TODO RESIDUI (non toccati in questa sessione, ancora aperti)

- `SHOPIFY_BILLING_TEST=false` prima dei merchant paganti reali (CRITICO).
- Cleanup pre-submission Shopify: console.log di debug, counter "0 products tagged" Step 5
  onboarding, Reviewer Notes in inglese.
- `generate-plan/route.ts` — toccato per errore in una sessione precedente (non è nel
  percorso Brand attivo), da decidere se ripristinare o lasciare (innocuo).
- Tech debt 3 tabelle domande quiz (sezione 3) — consolidamento rimandato post-scaling.
- `consistency.days_completed/days_expected` nello schema dashboard v2 — non esiste ancora
  un conteggio giorni reale nel backend, solo un punteggio qualitativo derivato da risposte
  (`adherenceScore`). Per ora `consistency.visible: false` finché non c'è il dato vero.
- Rendere `TEMP_TOTAL_WEEKS` (oggi hardcoded a 12) dinamico nello Status Ring.

---

## 10. METODO DI LAVORO (da mantenere in ogni sessione futura)

1. **Mai assumere, sempre verificare dal codice reale.** Se un'affermazione non è confermata
   da un'ispezione diretta, va dichiarata esplicitamente come ipotesi.
2. **Passi piccoli, un cambiamento alla volta.** Ispeziona → proponi il minimo cambiamento
   possibile → attendi conferma esplicita → applica → verifica (`tsc`, `git diff` isolato) →
   deploy → test reale → solo allora passa al successivo.
3. **Riusare prima di creare.** Nessuna nuova tabella/entità/servizio finché non è dimostrato
   che l'esistente non può essere esteso.
4. **Separare requisiti di prodotto da assunzioni tecniche.** Il "cosa" è fisso una volta
   congelato; il "come" resta aperto finché non verificato sul codice.
5. **Mai rompere la produzione per un miglioramento.** Ogni fase di migrazione deve lasciare
   il sistema funzionante com'era, finché il nuovo percorso non è pronto e verificato.
6. **Pulizia costante:** ogni script temporaneo con chiavi in chiaro va cancellato subito
   dopo l'uso (mai committato); verificare `git status` regolarmente nelle sessioni lunghe.
