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
attuale — fonte di diversi bug scoperti nelle sessioni precedenti (vedi sezione 6).

**Visione a lungo termine:** "Bloomberg del wellness" — piattaforma di intelligence sui dati
comportamentali (correlazioni prodotto→risultato), con API pubblica in futuro.

---

## 2. STATO DEL BUSINESS — SHOPIFY APP STORE

- Solo il **seller type "Brand"** è attivo. Practitioner e PDF Seller sono stati **nascosti**
  dall'onboarding (non rimossi dal codice — dormienti). `seller_type='brand'` forzato.
  Il Brand genera routine dai **prodotti acquistati dal catalogo**, mai da PDF/metodologia.
- App sospesa da Shopify per requisito 2.1.1, poi risolta: RLS mancanti su
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
| `customer_profiles` | Risposte quiz del cliente per quel merchant (`quiz_answers`, campo `version`). **Ha ora anche `recommendation_snapshot`** (jsonb, aggiunta in questa sessione — vedi sezione 8). |
| `brand_plans` | Il piano settimanale — `token`, `customer_id`, `merchant_id`, `week_number`, `plan_data`, `package_data` (bundle — **da rimuovere dal journey**, vedi sezione 7), `customer_summary`. |
| `brand_checkin_events` | Storico reale dei check-in — `brand_plan_id`, `customer_id`, `merchant_id`, `week_number`, `answers` (JSONB, risposte grezze), `adherence_score`, `improvement_score`, `had_reaction`, `reaction_detail`, `comment`. RLS con policy SELECT verificata. |
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
  informativa "Data state: X", **non ancora usato per cambiare il comportamento del prompt**.
- **7 regole hard nel systemPrompt**: solo prodotti dal catalogo, routine costruita sui
  prodotti già in uso, gestione reazioni (rimuovi non aggiungere), cross-sell max 1
  prodotto/ciclo solo se `intro_week === nextWeek`, **no claim medici**, **no ri-presentazione
  del profilo**, return JSON puro.
- **Bug risolto — "trascinamento Week 1":** `package_data` (starter bundle) e
  `customer_summary` (profilo) venivano copiati da `brand_plans` in ogni settimana successiva.
  Fix: `package_data: null` per week>1 in `submit-checkin`; rendering di `customer_summary`
  in `/routine/[token]/page.tsx` condizionato a `week_number === 1`. Verificato end-to-end.

---

## 5. DASHBOARD V2 — REDESIGN VISIVO (in produzione, componenti congelati)

**Design (non più da modificare senza richiesta esplicita):**
- `docs/dashboard-design/malyte-dashboard-01-architecture.md` — 11 carte, category-agnostic.
- `-02-visual-spec.md` — palette, tipografia, animazioni (stile calmo, Apple-like).
- `-03-json-schema.md` — contratto dati v1.0.0 (content/presentation separati).
- `lib/dashboard/malyte-dashboard-prompt.ts` — prompt di produzione per generare quel JSON.
  **Non ancora collegato a `submit-checkin` in produzione** — gira solo in uno script di
  verifica standalone.

**Componenti implementati in `app/routine/[token]/page.tsx` (5, tutti congelati):**
1. **Status Ring** — anello SVG, `TEMP_TOTAL_WEEKS` hardcoded a 12, niente animazioni.
2. **Coach Note** — Hero + Weekly notes uniti in una carta bianca centrata con avatar.
3. **Next Week Preview** — da verde acceso a palette neutra spenta.
4. **Evolution** — box di chiusura, simbolo ∞, palette neutra.
5. **Starter Bundle** — restilizzato ma concettualmente da rimuovere da questa pagina (sezione 7).

**Metodo seguito per ogni componente:** ispeziona codice esistente → proponi il cambiamento
minimo → attendi conferma esplicita → patch isolata → `tsc --noEmit` → `git diff` isolato →
deploy → verifica visiva reale. Mai riscritture, mai più sottosistemi insieme.

**Ancora da fare:** Routine Cards con tap-to-expand (richiede stato client, lasciato per ultimo).

---

## 6. BUG STRUTTURALI SCOPERTI E RISOLTI IN SESSIONI PRECEDENTI

1. **RLS mancante su UPDATE `shopify_products`** — Save prodotto tornava 204 ma non scriveva.
   Fix: policy `"user updates own shop products"` via SQL Editor. Confermato con test reale.

2. **`checkin_events` mai scritta da sempre** — FK verso `plans`/`plan_versions` vuote.
   Fix: nuova tabella `brand_checkin_events`, FK corrette verso tabelle reali.

3. **Trascinamento bundle/profilo oltre Week 1** — vedi sezione 4.

4. **Mismatch formato domande quiz** — due formati diversi coesistono, non intercambiabili.

**Metodo che ha permesso di trovarli:** mai fidarsi del nome di un file o di un'assunzione;
verificare con query di sola lettura prima di scrivere; distinguere sempre "requisito di
prodotto" da "assunzione tecnica".

---

## 7. CORREZIONE ARCHITETTURALE MAGGIORE — IL JOURNEY DI ONBOARDING (in corso)

**Il problema scoperto:** la routine Week 1 mostra oggi il bundle di partenza **come se il
cliente lo stesse ancora comprando**, dentro la stessa pagina che dovrebbe mostrare solo la
routine. Causa radice, verificata dal codice (`generate-plan-and-bundle/route.ts`):

- **Un'unica chiamata AI** genera piano e bundle insieme, con `plan` e `package` come chiavi
  sorelle nello stesso JSON.
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
il catalogo live), Week 1 Generation (usa quiz + metodologia + prodotti acquistati come
**vincolo**, non unico input), Routine Delivery (guardiano di stato), Weekly Check-in (invariato).

**Mappatura sul codice reale:**
- **Quiz Configuration Service** — già esiste, completo: `QuestionBuilder` in
  `ShopifyDashboard.tsx` → salva `merchant_profiles.customer_questions`. **Nessun gap.**
- **Quiz Response Collection Service** — già esiste: `app/start/[slug]/page.tsx` →
  `StartClient.tsx`. Gap: nessuna validazione lato server della completezza.
- **Recommendation Service** — era fuso con Week 1 Generation. **Ora separato e funzionante.**

**Piano di migrazione (10 fasi):**
Fase 0 (instrumentazione) → **Fase 1 (snapshot intermedio) ✅** → **Fase 2 (nuovo endpoint
raccomandazione) ✅** → Fase 3 (Week 1 post-acquisto) → Fase 4 (webhook acquisto) →
Fase 5 (guardiano osservazione) → Fase 6 (merchant di test) → Fase 7 (guardiano restrittivo)
→ Fase 8 (espansione) → Fase 9 (rimozione codice vecchio).

---

## 8. STATO DELL'IMPLEMENTAZIONE DELLA MIGRAZIONE (AGGIORNATO)

**Fatto, in ordine:**

1. ✅ **`lib/shopify-catalog.ts`** — `loadMerchantAndProductsContext(supabaseAdmin, merchant_id)`,
   estratta identica da `generate-plan-and-bundle`. Commit `e8b8624`, deploy verde.

2. ✅ **`resolveAndSaveCustomer(supabaseAdmin, merchant_id, customer_email, quiz_answers)`**
   nello stesso file, estratta identica. Commit `6dfa81d`, deploy verde.

3. ✅ **`generate-plan-and-bundle/route.ts` refactorizzato** per usare le funzioni estratte.
   Comportamento verificato identico (tsc pulito, git diff isolato).

4. ✅ **`app/api/shopify/generate-recommendation/route.ts`** — nuovo endpoint isolato, non
   collegato al frontend, riusa le funzioni estratte, prompt ristretto alla sola
   raccomandazione (`customer_analysis`, `reasoning`, `recommended_products` con `why`,
   `warnings`). Testato via curl su merchant Lumière Skin (`cbbad5ba-c96d-4b99-a904-5fc25e91685c`),
   scenario pelle sensibile: Status 200, JSON conforme, nessun campo `plan`/`package` presente.
   Qualità: il modello ha segnalato onestamente i limiti del catalogo (no dati ingredienti) e
   ha escluso attivamente prodotti aggressivi per il profilo. Commit `a90fe34`, deploy verde.

5. ✅ **Recommendation Snapshot persistente (Fase 1 completata).** Colonna
   `customer_profiles.recommendation_snapshot` (jsonb, nullable) aggiunta via SQL Editor.
   L'endpoint salva lì `customer_analysis`, `reasoning`, `recommended_products`, `warnings`,
   `created_at`, subito dopo `resolveAndSaveCustomer`. **Verificato con lettura diretta dal
   DB**: contenuto identico tra risposta HTTP e riga persistita (customer_id
   `4b2de5be-0dd6-4a20-9721-6e22211274a6`). Primo momento in cui una raccomandazione esiste
   come oggetto immutabile e verificabile, pronto per il confronto contro un acquisto reale.

**Note tecniche pratiche emerse (da ricordare):**
- Dopo ogni push, attendere che il deployment Vercel risulti "Ready" prima di testare — un
  curl troppo ravvicinato dà 404 per puro timing, non errore reale. Verificare sempre lo
  stato su `vercel.com/poulmalytes-projects/malyte-mvp/deployments` prima di indagare altrove.
- Sequenza di debug corretta per problemi di deploy: (1) stato deployment Vercel, (2) file
  esiste nel path locale atteso (`find`), (3) `git log --oneline` locale vs `git log
  origin/main --oneline` per isolare se il problema è commit/push/deploy, (4) log di build
  Vercel, (5) solo dopo, cache/propagazione.
- **I comandi `cat > file << 'EOF' ... EOF` vanno sempre incollati nel TERMINALE, mai
  nell'editor di codice** — se incollati per errore nell'editor, il file si riempie di testo
  bash non valido invece del codice atteso (causa tipica di errori tsc improvvisi e
  inspiegabili tipo "Cannot find name 'cat'"). Verificare sempre con `head -5 nomefile` dopo
  una scrittura sospetta, o con `tsc --noEmit` che la fa emergere subito.
- Il container/ambiente di lavoro può resettarsi tra un messaggio e l'altro in sessioni
  molto lunghe — se un file "creato" risulta poi assente su disco (`ls` dà "No such file"),
  non è un errore dell'utente: va semplicemente ricreato.

6. ✅ **`app/api/shopify/generate-week1-routine/route.ts` — Fase 3 completata.** Nuovo
   endpoint isolato, non collegato al frontend. Riceve `merchant_id`, `customer_id`,
   `purchased_product_ids` (per ora passati esplicitamente nel body — non ancora collegati
   a un vero evento di acquisto, quello è la Fase 4). Legge `quiz_answers` da
   `customer_profiles`, filtra `productsContext` per includere SOLO i prodotti il cui id è
   in `purchased_product_ids` (vincolo assoluto), genera la routine con quiz+metodologia per
   personalizzare tono/istruzioni ma MAI per introdurre prodotti extra. Salva in `brand_plans`
   con `package_data: null` esplicito (niente bundle, mai, in questo endpoint).
   **Test reale via curl** su Lumière Skin, cliente con 2 prodotti "acquistati" su 4
   raccomandati (Gentle Cleansing Gel + Ceramide Repair Moisturizer, esclusi Hydrating Serum
   e SPF): routine mattina/sera generata **esclusivamente** con i 2 prodotti posseduti,
   zero menzione dei 2 esclusi nemmeno nel testo libero, `what_changes_next_week` generico
   e prudente ("Week 2 may be the right time...") senza nominare prodotti specifici non
   posseduti. **Vincolo verificato tenere anche con un sottoinsieme parziale del bundle
   raccomandato — il caso più realistico**, non solo "tutto o niente". Commit da confermare
   dopo deploy verde.

**Da fare (prossimi passi, in ordine):**
- **Fase 4**: collegare un evento di acquisto reale a `generate-week1-routine` — verificare
  quale file gestisce oggi i webhook Shopify (`orders/paid` o simili), non ancora ispezionato
  in questa serie di sessioni. Il segnale reale sostituirà il parametro
  `purchased_product_ids` passato a mano usato nel test.
- **Fase 5, poi 7**: guardiano su `/routine/[token]/page.tsx`.
- **Fase 6, 8**: instradare un merchant di test, poi espandere.
- **Fase 9**: rimuovere `generate-plan-and-bundle` come codice morto, solo a fine migrazione.

---

## 9. TODO RESIDUI

- `SHOPIFY_BILLING_TEST=false` prima dei merchant paganti reali (CRITICO).
- Cleanup pre-submission Shopify: console.log di debug, counter "0 products tagged", Reviewer
  Notes in inglese.
- `generate-plan/route.ts` — toccato per errore in sessione precedente, non nel percorso
  attivo, decidere se ripristinare (innocuo).
- Tech debt 3 tabelle domande quiz — consolidamento rimandato post-scaling.
- `consistency.days_completed/days_expected` nello schema dashboard v2 — nessun conteggio
  giorni reale nel backend ancora. `consistency.visible: false` per ora.
- Rendere `TEMP_TOTAL_WEEKS` (hardcoded 12) dinamico nello Status Ring.

---

## 10. METODO DI LAVORO (da mantenere in ogni sessione futura)

1. **Mai assumere, sempre verificare dal codice reale.**
2. **Passi piccoli, un cambiamento alla volta** — ispeziona, proponi il minimo, attendi
   conferma, applica, verifica (tsc, git diff isolato), deploy, test reale, solo poi il
   prossimo passo.
3. **Riusare prima di creare.** Nessuna nuova tabella/entità/servizio finché non dimostrato
   che l'esistente non basta.
4. **Separare requisiti di prodotto da assunzioni tecniche.**
5. **Mai rompere la produzione per un miglioramento.**
6. **Pulizia costante:** script temporanei con chiavi in chiaro vanno cancellati subito,
   mai committati; verificare `git status` regolarmente.
7. **Dopo ogni push, attendere "Ready" su Vercel prima di testare.**
8. **I comandi `cat > file << EOF` vanno sempre nel terminale, mai nell'editor di codice.**
