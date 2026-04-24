# MALYTE — PROJECT BRIEF & HANDOFF DOCUMENT
> Aggiorna questo file ogni fine sessione. Incollalo all'inizio di ogni nuova chat.

---

## 📌 ISTRUZIONI PER CLAUDE (leggi sempre per primo)

Sei Claude e stai lavorando con Poul al progetto Malyte. Questo documento contiene tutto il contesto del progetto. Leggi tutto prima di rispondere. Quando Poul ti dice "Siamo al Giorno X, iniziamo" — vai direttamente alla sezione di quel giorno, scrivi il codice richiesto e guida passo per passo senza riepilogare cose già fatte. Alla fine di ogni sessione fornisci automaticamente il riepilogo nel formato indicato in fondo a questo documento.

---

## 🏢 PANORAMICA PROGETTO

**Nome:** Malyte
**Tipo:** Marketplace AI-powered per professionisti del wellness
**Status:** MVP in sviluppo — Landing page completata

**Concept core:**
Gli esperti del benessere (personal trainer, nutrizionisti, skincare expert) caricano la loro metodologia su Malyte. L'AI (Claude) la trasforma in prodotti digitali personalizzati che i clienti possono acquistare. L'expert scala il proprio lavoro senza sessioni one-to-one. Il cliente riceve un piano personalizzato basato sull'expertise del professionista.

**Il momento magico:**
Expert carica metodologia → Claude genera prodotto digitale → Cliente compra → Claude genera piano personalizzato per quel cliente specifico

---

## 🛠 STACK TECNICO

| Componente | Tecnologia | Perché |
|---|---|---|
| Frontend + Backend | Next.js 14 (App Router) | Full-stack, ottimo con Vercel |
| Database + Auth | Supabase | Gratuito, PostgreSQL, auth inclusa |
| Deploy | Vercel | Deploy automatico da GitHub, gratuito |
| Pagamenti | Stripe | Standard industria |
| AI Layer | Anthropic Claude API (claude-sonnet-4-20250514) | Core differenziante di Malyte |
| Styling | Tailwind CSS | Veloce, consistente |
| Version control | GitHub | Collegato a Vercel per deploy automatico |

---

## 💻 AMBIENTE DI SVILUPPO

- **Computer:** Mac
- **Node.js:** v24.14.1
- **Editor:** VS Code
- **Cartella progetto:** `~/Desktop/malyte-mvp`
- **Package manager:** npm

---

## 🔑 VARIABILI D'AMBIENTE

File `.env` nella root del progetto. **Non condividere mai questi valori.**

```
NEXT_PUBLIC_SUPABASE_URL=            ← da Supabase → Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=       ← da Supabase → Settings → API → anon public
SUPABASE_SERVICE_ROLE_KEY=           ← da Supabase → Settings → API → service_role
ANTHROPIC_API_KEY=                   ← da console.anthropic.com → API Keys
STRIPE_SECRET_KEY=                   ← da stripe.com → Developers → API Keys (Giorno 8)
STRIPE_PUBLISHABLE_KEY=              ← da stripe.com → Developers → API Keys (Giorno 8)
STRIPE_WEBHOOK_SECRET=               ← da stripe.com → Webhooks (Giorno 8)
NEXTAUTH_SECRET=                     ← stringa random, genera con: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

---

## 📁 STRUTTURA CARTELLE PROGETTO

```
malyte-mvp/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                  ← Landing page
│   │   ├── login/page.tsx            ← Login
│   │   ├── signup/page.tsx           ← Signup
│   │   └── marketplace/page.tsx      ← Marketplace clienti
│   ├── (expert)/
│   │   ├── onboarding/page.tsx       ← Wizard onboarding expert
│   │   └── dashboard/page.tsx        ← Dashboard expert
│   ├── (client)/
│   │   └── my-plans/page.tsx         ← Area cliente post-acquisto
│   └── api/
│       ├── generate-product/route.ts ← Claude API → genera prodotto
│       ├── generate-plan/route.ts    ← Claude API → genera piano cliente
│       └── stripe/webhook/route.ts  ← Stripe webhook
├── components/
│   ├── ui/                           ← Componenti base (Button, Input, Card)
│   ├── expert/                       ← Componenti dashboard expert
│   └── marketplace/                  ← Componenti marketplace
├── lib/
│   ├── supabase.ts                   ← Client Supabase
│   ├── anthropic.ts                  ← Client Anthropic
│   └── stripe.ts                     ← Client Stripe
├── .env                              ← Variabili d'ambiente (mai su GitHub)
├── .gitignore                        ← Include .env
├── package.json
└── tailwind.config.ts
```

---

## 🗄 SCHEMA DATABASE SUPABASE

```sql
-- Utenti (gestito da Supabase Auth)
-- La tabella auth.users esiste già automaticamente

-- Profili expert
CREATE TABLE experts (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  slug TEXT UNIQUE,
  category TEXT,
  methodology_name TEXT,
  methodology_description TEXT,
  results_description TEXT,
  materials_urls TEXT[],
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prodotti digitali generati dall'AI
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID REFERENCES experts(id),
  title TEXT,
  description TEXT,
  price DECIMAL,
  pricing_model TEXT,
  ai_generated_content JSONB,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Acquisti
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id),
  product_id UUID REFERENCES products(id),
  stripe_payment_id TEXT,
  amount DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Piani personalizzati per cliente
CREATE TABLE client_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES purchases(id),
  client_id UUID REFERENCES auth.users(id),
  product_id UUID REFERENCES products(id),
  questionnaire_answers JSONB,
  ai_generated_plan JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎨 DESIGN SYSTEM

**Palette colori:**
```css
--bg: #070B14          /* sfondo principale */
--surface: #0D1525     /* card e pannelli */
--surface2: #111D35    /* elementi secondari */
--border: rgba(99,130,255,0.15)
--violet: #7C5CFC      /* colore primario */
--violet-light: #A78BFA
--neon: #4DFFD2        /* accento verde acqua */
--neon2: #6385FF
--text: #E8EDF8
--muted: #6B7A99
```

**Font:** Syne (titoli, 800) + DM Sans (testo, 300-500)
**Border radius:** 12px card piccole, 20px card grandi, 100px pillole
**Stile generale:** Dark, minimal, neon accents — premium tech

---

## ✅ STATO AVANZAMENTO

### Setup iniziale
- [x] Account GitHub creato
- [x] Account Vercel creato
- [x] Account Supabase creato
- [x] Account Anthropic API creato
- [x] Node.js v24.14.1 installato
- [x] VS Code installato
- [x] Cartella malyte-mvp creata
- [x] File .env creato con chiavi

### Giorno 1 — Struttura base + Landing
- [x] Struttura Next.js inizializzata
- [x] Landing page integrata nel framework
- [x] Routing base configurato
- [x] Sito gira in locale su localhost:3000
- [x] Prima push su GitHub

### Giorno 2 — Database + Auth
- [x] Schema SQL eseguito su Supabase
- [x] Pagina /login funzionante
- [x] Pagina /signup funzionante
- [x] Redirect post-login alla dashboard
- [x] Middleware protezione route private

### Giorno 3 — Onboarding Expert pt.1
- [x] Step 1: dati profilo + categoria
- [x] Step 2: metodologia + upload file
- [x] Bucket Supabase Storage creato
- [x] Dati si salvano nel DB

### Giorno 4 — Onboarding Expert pt.2
- [x] Step 3: pricing e modello vendita
- [x] Pagina profilo pubblico /expert/[slug]
- [x] Logica pubblicazione prodotto
- [x] Onboarding completo testato end-to-end

### Giorno 5 — AI Generation Layer
- [x] Route API /api/generate-product
- [x] Prompt engineering ottimizzato
- [x] Interfaccia generazione con loading
- [x] Output AI salvato nel DB
- [x] Test generazione funzionante

### Giorno 6 — Dashboard Expert
- [x] KPI reali (guadagni, clienti, rating)
- [x] Lista prodotti con stato live/bozza
- [x] Sezione clienti con lista acquisti
- [x] Grafici guadagni con dati reali

### Giorno 7 — Marketplace Cliente
- [x] Pagina /marketplace con grid prodotti
- [x] Filtri categoria, prezzo, rating
- [x] Pagina dettaglio /product/[id]
- [x] Sistema di ricerca

### Giorno 8 — Stripe + Pagamenti
- [ ] Stripe Checkout integrato
- [ ] Webhook configurato
- [ ] Pagina successo post-acquisto
- [ ] Accesso prodotto sbloccato dopo pagamento
- [ ] Test con carta 4242 4242 4242 4242

### Giorno 9 — Area Cliente + Piano AI
- [x] Dashboard cliente con prodotti acquistati
- [x] Questionario personalizzazione
- [x] Generazione piano AI personalizzato
- [x] Sistema check-in settimanale

### Giorno 10 — Deploy + Go Live
- [ ] Configurazione Vercel produzione
- [ ] Variabili d'ambiente su Vercel
- [ ] Deploy su malyte.com
- [ ] Test end-to-end completo in produzione

---

## 🧠 DECISIONI GIÀ PRESE

- Stack: Next.js + Supabase + Vercel (non Bubble, non altri no-code)
- AI model: claude-sonnet-4-20250514 per generazione prodotti e piani
- Auth: Supabase Auth nativa (non NextAuth separato)
- Pagamenti: Stripe Checkout hosted (non custom)
- Deploy: Vercel con GitHub integration (push = deploy automatico)
- Landing page: già completata, da integrare nel framework Next.js
- Design: dark blue + violet neon, font Syne + DM Sans

---

## 📋 FORMATO RIEPILOGO FINE SESSIONE

> Claude: alla fine di ogni sessione fornisci SEMPRE questo riepilogo automaticamente, senza che Poul lo chieda.

---

**📋 FINE SESSIONE — Aggiorna il tuo MALYTE_PROJECT_BRIEF.md con questo:**

✅ **Completato oggi:**
- [lista precisa di cosa abbiamo fatto]

📁 **File creati/modificati:**
- [percorso file — descrizione]

⚠️ **Aperto per domani:**
- [bug, cose rimaste a metà, domande aperte]

🔜 **Prossima sessione — Giorno X:**
- [obiettivo del giorno successivo]

**Spunta le checkbox corrispondenti nella sezione STATO AVANZAMENTO**

---
*Documento creato il 13 Aprile 2026 — Aggiorna ad ogni sessione*

## 📝 NOTE SESSIONE GIORNO 1
- Repository GitHub: github.com/Poulmalyte/malyte-mvp
- globals.css ha pallino arancione in VS Code — non blocca niente
- Token GitHub salvato su Notes

## 📝 NOTE SESSIONE GIORNO 2
- 4 tabelle create su Supabase: experts, products, purchases, client_plans
- Row Level Security configurata
- Auth completa: registrazione → email conferma → login → dashboard
- File chiave: lib/supabase-server.ts, middleware.ts, app/auth/callback/route.ts
- Utente di test creato: poul.todu@gmail.com

## 📝 NOTE SESSIONE GIORNO 3
- Bucket Storage expert-materials creato con policy SELECT/INSERT/UPDATE/DELETE
- Onboarding wizard 2 step funzionante
- Dati expert salvati in tabella experts — primo record: Poul Todu
- File chiave: app/(expert)/onboarding/page.tsx

## 📝 NOTE SESSIONE GIORNO 4
- Onboarding aggiornato a 3 step
- Step 3 crea il prodotto nella tabella products
- Pagina profilo pubblico funzionante: /expert/[slug]
- Slug di test: mario-bros-tgp0kd
- File chiave: app/(public)/expert/[slug]/page.tsx

## 📝 NOTE SESSIONE GIORNO 5
- Route API /api/generate-product con prompt zero-invention
- Pagina /generate con review e approvazione obbligatoria
- Dashboard aggiornata con card azioni
- Sistema AI si comporta da archivista: usa solo dati dell'expert, mai inventa
- Campi "Per chi è" / "Non adatto a" escono "Da specificare" — dati profilo test scarsi, normale
- File chiave: app/api/generate-product/route.ts, app/(expert)/generate/page.tsx

## 📝 NOTE SESSIONE GIORNO 6
- Dashboard expert riscritta con dati reali da Supabase
- KPI card: guadagni totali, clienti totali, prodotti live
- Grafico guadagni ultimi 6 mesi (CSS puro, nessuna libreria)
- Lista prodotti con badge Live/Bozza e toggle pubblica/nascondi
- PublishToggle come client component separato
- File chiave: app/(expert)/dashboard/page.tsx, app/(expert)/dashboard/PublishToggle.tsx

## 📝 NOTE SESSIONE GIORNO 7
- Pagina /marketplace con grid prodotti pubblicati, filtri categoria e ricerca
- MarketplaceFilters come client component separato con URL params
- Pagina /product/[id] con dettaglio completo, box acquisto e profilo expert
- Fix Next.js 15: params asincroni risolto con await params
- File chiave: app/(public)/marketplace/page.tsx, app/(public)/marketplace/MarketplaceFilters.tsx, app/(public)/product/[id]/page.tsx

## 📝 NOTE SESSIONE GIORNO 9
- Mock purchase inserito su Supabase per test (senza Stripe)
- RLS policy aggiunte per tabella client_plans (INSERT, UPDATE, SELECT)
- Questionario dinamico per categoria: nutrition, fitness, skincare, default
- Generazione piano AI funzionante end-to-end con Claude claude-sonnet-4-20250514
- Check-in settimanale con mood tracker e domande generate dall'AI
- Bug fix: createBrowserSupabaseClient → createClient in questionnaire/page.tsx
- Bug fix: user?.id ?? '' in plan/page.tsx per evitare crash
- File chiave: app/api/generate-plan/route.ts, app/(client)/my-plans/[purchaseId]/questionnaire/page.tsx, app/(client)/my-plans/[purchaseId]/plan/page.tsx, app/(client)/my-plans/[purchaseId]/checkin/page.tsx

## 📝 NOTE SESSIONE GIORNO 9 (continuazione)

### Prompt AI generate-plan (ultimo aggiornamento)
- max_tokens: 8192
- Struttura JSON: welcome_message, plan_title, plan_subtitle, duration_weeks, client_stats, quick_start, daily_meal_plan (con meals → colazione/spuntino/pranzo/cena, ognuno con calories/macro/options/ingredients), weekly_phases (con mindset/adjustments/weekly_goal/tips), daily_guidelines, common_mistakes, success_metrics, faqs, closing_message, weekly_checkin_questions
- Server deve essere avviato con: NODE_OPTIONS="--max-old-space-size=8192" npm run dev

### Fix eseguiti
- Bug categoria onboarding fixato: aggiunto type="button" al button categorie (riga 190, app/(expert)/onboarding/page.tsx)
- Plan page aggiornata con sezione daily_meal_plan e client_stats
- RLS policy client_plans aggiunte
- Expert demo: Marco Nutrizione (nutrition) + Sara Smith (skincare/GlowReset)

### Dati demo
- User ID: cbbad5ba-c96d-4b99-a904-5fc25e91685c (poul.todu@gmail.com)
- Product NutriReset ID: a1ab47b9-9265-49ab-8d0f-c438e5f8adf1
- GlowReset: da recuperare con SELECT id FROM products WHERE title LIKE '%GlowReset%'
- Purchase mock già inserito per NutriReset

### Stato demo
- ✅ Seller flow completo: onboarding → genera AI → approva → pubblica
- ✅ Buyer flow parziale: my-plans → questionario → piano con scheda pasti
- ⏳ Manca: pulsante Buy Now fake nella pagina prodotto per demo buyer completa

## 📝 NOTE SESSIONE GIORNO 9 (continuazione 2)
- Pulsante Buy Now fake integrato in /product/[id]
- API route /api/create-purchase con supabaseAdmin (bypassa RLS)
- BuyNowButton aggiornato per chiamare la route invece di Supabase diretto
- ALTER TABLE purchases ADD COLUMN stripe_payment_id TEXT eseguito
- Flusso buyer completo testato end-to-end
- ✅ Seller flow: onboarding → genera AI → approva → pubblica
- ✅ Buyer flow: marketplace → prodotto → acquista → questionario → piano AI
- ⏳ Giorno 8 Stripe saltato — da fare post-validazione Lemon Squeezy
- File chiave: app/(public)/product/[id]/page.tsx, app/(public)/product/[id]/BuyNowButton.tsx, app/api/create-purchase/route.ts

## 📝 SESSION NOTES DAY 9 (continued 3 — Full English translation)

### Files translated to English
- app/(public)/product/[id]/page.tsx — all UI text translated
- app/(public)/product/[id]/BuyNowButton.tsx — button text and error messages
- app/(public)/marketplace/page.tsx — header, filters, product grid
- app/(public)/marketplace/MarketplaceFilters.tsx — search placeholder, category filter logic (Tutti → All)
- app/(expert)/dashboard/page.tsx — KPIs, sections, date locale en-US
- app/(expert)/generate/page.tsx — all labels, buttons, notices
- app/(expert)/onboarding/page.tsx — all 3 steps fully translated
- app/(public)/login/page.tsx — form labels, error messages, links
- app/(public)/signup/page.tsx — form labels, validation messages, success screen

### Files already in English (no changes needed)
- app/(client)/my-plans/[purchaseId]/questionnaire/page.tsx
- app/(client)/my-plans/[purchaseId]/plan/page.tsx
- app/(client)/my-plans/[purchaseId]/checkin/page.tsx

### Status
- ✅ App fully in English
- ✅ 0 errors, 0 warnings in VS Code
- ✅ Server running on localhost:3000

## 📝 SESSION NOTES DAY 9 (continued 4 — Seller product creation)
- Removed AI product generation from seller flow entirely
- New page /create-product with manual product creation form
- Seller defines custom questions per product: open answer + multiple choice
- Multiple choice supports single or multiple selection (toggle set by seller)
- Dashboard rebuilt: + Create product button, KPI cards, product list with question count
- Marketplace updated: removed ai_generated_content filter, all published products visible
- Questionnaire updated: loads custom questions from product_questions table
- Multiple selection answers normalized to comma-separated strings before sending to AI
- New table: product_questions (id, product_id, question_text, question_type, options JSONB, allow_multiple BOOLEAN, order_index)
- RLS policies added for product_questions
- ALTER TABLE product_questions ADD COLUMN allow_multiple BOOLEAN DEFAULT false
- ✅ Seller flow: create product → add questions → publish → live on marketplace
- ✅ Buyer flow: marketplace → product → buy → custom questionnaire → AI plan
- ✅ Full app in English
- ⏳ Day 8 Stripe — to be done post Lemon Squeezy validation
- ⏳ Day 10 Deploy Vercel — next session
- File chiave: app/(expert)/create-product/page.tsx, app/(expert)/dashboard/page.tsx, app/(expert)/dashboard/PublishToggle.tsx, app/(public)/marketplace/page.tsx, app/(client)/my-plans/[purchaseId]/questionnaire/page.tsx

## 📝 SESSION NOTES DAY 9 (continued 5 — Weekly plan system)

### Changes made
- Weekly plan system: AI generates 1 week at a time (7 days × 3 meals) instead of full month
- Unlock logic: Week N+1 unlocks at Day 6 hour 18:00 after check-in completion
- Seller now defines two sets of questions: Initial questions + Weekly check-in questions
- Weekly check-in answers are passed to AI to adapt next week's plan
- Prompt optimized: 3 meals/day (no snacks), max 3 ingredients, concise text to avoid OOM errors

### Database changes
- ALTER TABLE products ADD COLUMN duration_months INTEGER DEFAULT 1
- ALTER TABLE client_plans ADD COLUMN current_week INTEGER DEFAULT 1
- ALTER TABLE client_plans ADD COLUMN week_start_date TIMESTAMPTZ DEFAULT NOW()
- ALTER TABLE client_plans ADD COLUMN total_weeks INTEGER DEFAULT 4
- CREATE TABLE product_checkin_questions (id, product_id, question_text, question_type, options, order_index)
- CREATE TABLE weekly_checkins (id, purchase_id, client_id, week_number, answers, created_at)

### Files created/modified
- app/(expert)/create-product/page.tsx — added duration selector, split into Initial questions + Weekly check-in questions sections, shared QuestionBuilder component
- app/api/generate-plan/route.ts — generates 1 week at a time, accepts weekNumber + checkinAnswers, stores weeks[] array in ai_generated_plan
- app/(client)/my-plans/[purchaseId]/questionnaire/page.tsx — passes weekNumber: 1 to API
- app/(client)/my-plans/[purchaseId]/plan/page.tsx — rebuilt for weekly format, unlock logic, week navigation
- app/(client)/my-plans/[purchaseId]/plan/WeeklyCheckinButton.tsx — new file
- app/(client)/my-plans/[purchaseId]/plan/GenerateNextWeekButton.tsx — new file
- app/(client)/my-plans/[purchaseId]/weekly-checkin/[weekNumber]/page.tsx — new file, saves checkin + generates next week

### Plan data structure
- ai_generated_plan: { weeks: [{ week_number, plan_title, days: [7 days × 3 meals], ... }], current_week, total_weeks }
- Each week generated independently with context from previous check-in
- In development mode: checkin unlock bypassed for testing

### Status
- ✅ create-product with duration + initial + checkin questions
- ✅ generate-plan generates 1 week at a time
- ✅ Weekly checkin page built
- ⏳ Testing end-to-end with new product pending (OOM fix applied)
- ⏳ Day 8 Stripe — post Lemon Squeezy
- ⏳ Day 10 Deploy Vercel — next session

## 📝 RIPRESA SESSIONE — PROSSIMO STEP
- Creare nuovo prodotto demo con: initial questions + weekly check-in questions
- Testare flusso completo: questionario → Week 1 → check-in → Week 2 adattata
- Il prodotto "3-Month Body Transformation" NON ha check-in questions (creato prima della feature)

## 📝 SESSION NOTES DAY 9 (continued 6 — Design redesign + Progress system)

### Design system aggiornato
- Nuovo design "mixed": hero dark (#14182A) + body light (#F5F4F0) + footer dark (#1E2337)
- Font: Syne (titoli) + DM Sans (body)
- Stat cards con valori in teal (#4DFFD2) su sfondo dark
- Meal dots colorati per tipo: gold breakfast, green lunch, violet dinner
- Progress bar viola nel hero
- Week navigation pills
- Goal pill amber in body

### Weekly Wisdom section
- Sezione dopo i 7 giorni con: Expert tip, Common mistakes, Success metrics
- Dati generati dall'AI nel prompt (campi aggiunti: common_mistakes[], success_metrics[])
- Expert tip con avatar e firma dell'expert

### Progress indicators system
- Seller sceglie fino a 4 indicatori per prodotto (preset + custom)
- ALTER TABLE products ADD COLUMN progress_indicators JSONB DEFAULT '[]'
- ALTER TABLE weekly_checkins ADD COLUMN indicator_scores JSONB DEFAULT '{}'
- Dopo ogni check-in, /api/score-indicators chiama Claude per assegnare punteggi 1-10
- Grafico barre nel plan page: W1-W12 con barre colorate per indicatore
- Metric cards sotto il grafico con delta vs settimana precedente

### File creati/modificati
- app/(expert)/create-product/page.tsx — aggiunta sezione progress indicators con preset + custom
- app/(client)/my-plans/page.tsx — nuova lista acquisti (era missing)
- app/(client)/my-plans/[purchaseId]/plan/page.tsx — redesign completo mixed
- app/(client)/my-plans/[purchaseId]/plan/GenerateNextWeekButton.tsx — fix router.push
- app/(client)/my-plans/[purchaseId]/weekly-checkin/[weekNumber]/page.tsx — redesign + indicators preview
- app/api/score-indicators/route.ts — nuova route, scoring AI degli indicatori
- app/api/generate-plan/route.ts — aggiunti campi common_mistakes e success_metrics al prompt

### Stato
- ✅ Flusso buyer completo con nuovo design
- ✅ Weekly Wisdom (expert tip, mistakes, success metrics)
- ✅ Progress indicators scelti dal seller
- ✅ Grafico progressi aggiornato dopo ogni check-in
- ✅ Score AI automatico via /api/score-indicators
- ⏳ Day 8 Stripe / Lemon Squeezy — post validazione
- ⏳ Day 10 Deploy Vercel — prossima sessione

### Dati demo
- Purchase ID attivo: 9dec6f61-7152-4166-8aa2-31f34417a247
- Product ID (12-Week Nutrition Reset): 35c04b7b-df98-48cf-af66-e93bfa9aa668
- Progress indicators aggiunti via SQL: energy, adherence, weight_loss
- W1 e W2 check-in mock inseriti manualmente per testare il grafico

## 📝 SESSION NOTES DAY 9 (continued 7 — Full mixed design system)

### Design system applicato a tutte le pagine
- Layout mixed applicato uniformemente: hero dark (#14182A) + body light (#F5F4F0) + footer dark (#1E2337)
- Font: Syne (titoli) + DM Sans (body) su tutte le pagine
- Colori hardcoded sostituiti alle CSS variables per consistenza

### Pagine aggiornate
- app/(public)/marketplace/page.tsx — hero dark con filtri, body light con product cards bianche
- app/(public)/product/[id]/page.tsx — hero dark con stats row, body light con metodologia + how it works, purchase box dark sticky
- app/(public)/login/page.tsx — hero dark con logo, body light con form, footer dark
- app/(public)/signup/page.tsx — stesso layout login
- app/(expert)/dashboard/page.tsx — hero dark con KPI cards, body light con grafico + prodotti + acquisti
- app/(expert)/create-product/page.tsx — hero dark, body light con card sezioni, footer dark
- app/(client)/my-plans/page.tsx — hero dark, body light con lista acquisti, footer dark
- app/(client)/my-plans/[purchaseId]/questionnaire/page.tsx — hero dark con step indicator, body light con domande
- app/(client)/my-plans/[purchaseId]/weekly-checkin/[weekNumber]/page.tsx — hero dark, body light con domande, indicators preview, footer dark

### Fix tecnici
- searchParams unwrappato con await in marketplace/page.tsx (Next.js 15)
- Processo bloccato sulla porta 3000 risolto con riavvio Mac
- my-plans/page.tsx era il file sbagliato — ricreato correttamente

### Stato
- ✅ Design mixed applicato a tutte le pagine
- ⏳ Day 8 Stripe / Lemon Squeezy — post validazione
- ⏳ Day 10 Deploy Vercel — prossima sessione

## 📝 SESSION NOTES — Seller Profile & Public Page

### Obiettivo sessione
- Creare pagina profilo seller (gestione interna) `/expert/profile`
- Creare pagina pubblica seller (vista buyer) `/expert/[slug]` — da fare prossima sessione

### Database changes
- ALTER TABLE experts ADD COLUMN avatar_url TEXT
- ALTER TABLE experts ADD COLUMN tagline TEXT
- ALTER TABLE experts ADD COLUMN bio TEXT
- ALTER TABLE experts ADD COLUMN years_experience INTEGER
- ALTER TABLE experts ADD COLUMN credentials TEXT[]
- ALTER TABLE experts ADD COLUMN instagram_url TEXT
- ALTER TABLE experts ADD COLUMN website_url TEXT
- ALTER TABLE experts ADD COLUMN tiktok_url TEXT
- ALTER TABLE experts ADD COLUMN youtube_url TEXT
- ALTER TABLE experts ADD COLUMN linkedin_url TEXT

### File creati/modificati
- app/(expert)/profile/page.tsx — nuova pagina profilo seller (Identity, About, Credentials, Links)
- app/(expert)/dashboard/page.tsx — aggiunto bottone "Edit Profile" affiancato a "+ Create product"

### Stato
- ✅ Pagina profilo seller completa e funzionante
- ✅ Campi: nome, tagline, avatar URL, bio, anni exp, credenziali, Instagram, TikTok, YouTube, LinkedIn, website
- ✅ Link Edit Profile nella dashboard
- ⏳ Pagina pubblica seller `/expert/[slug]` (vista buyer) — prossimo step
- ⏳ Day 8 Stripe / Lemon Squeezy — post validazione
- ⏳ Day 10 Deploy Vercel

## 📝 SESSION NOTES — Seller Profile & Public Page (completato)

### File creati/modificati
- app/(expert)/profile/page.tsx — pagina profilo seller (Identity, About, Credentials, Links)
- app/(expert)/dashboard/page.tsx — aggiunto bottone "Edit Profile" affiancato a "+ Create product"
- app/(public)/expert/[slug]/page.tsx — pagina pubblica expert (vista buyer)
- app/(public)/marketplace/page.tsx — card ora linkano a /expert/[slug] invece di /product/[id]

### Database changes
- ALTER TABLE experts ADD COLUMN avatar_url TEXT
- ALTER TABLE experts ADD COLUMN tagline TEXT
- ALTER TABLE experts ADD COLUMN bio TEXT
- ALTER TABLE experts ADD COLUMN years_experience INTEGER
- ALTER TABLE experts ADD COLUMN credentials TEXT[]
- ALTER TABLE experts ADD COLUMN instagram_url TEXT
- ALTER TABLE experts ADD COLUMN website_url TEXT
- ALTER TABLE experts ADD COLUMN tiktok_url TEXT
- ALTER TABLE experts ADD COLUMN youtube_url TEXT
- ALTER TABLE experts ADD COLUMN linkedin_url TEXT
- UPDATE experts SET is_published = true WHERE slug = 'sara-smith-e8lji7'

### Flusso buyer aggiornato
- Marketplace → Profilo Expert (/expert/[slug]) → Prodotto (/product/[id]) → Acquisto

### Pagina pubblica expert mostra
- Avatar, nome, categoria, anni esperienza
- Tagline, bio
- Credenziali come pill
- Social links (Instagram, TikTok, YouTube, LinkedIn, Website)
- Recensioni (placeholder — sistema reale da implementare)
- Lista prodotti pubblicati con link a /product/[id]

### Stato
- ✅ Profilo seller (gestione interna) completo
- ✅ Pagina pubblica expert (vista buyer) completa
- ✅ Marketplace aggiornato con nuovo flusso
- ⏳ Sistema recensioni reale — post validazione
- ⏳ Day 8 Stripe / Lemon Squeezy — post validazione
- ⏳ Day 10 Deploy Vercel — prossima sessione

## 📝 SESSION NOTES — Avatar upload + Buyer profile

### Funzionalità aggiunte
- Upload foto profilo reale via Supabase Storage (bucket: avatars)
- Seller: clicca sull'avatar nella pagina /profile per cambiare foto
- Buyer: clicca sull'avatar nella pagina /account per cambiare foto

### Database changes
- CREATE TABLE profiles (id, name, avatar_url, birth_date, sex, created_at)
- RLS policies aggiunte su profiles
- ALTER TABLE profiles ADD COLUMN birth_date DATE
- ALTER TABLE profiles ADD COLUMN sex TEXT

### Supabase Storage
- Bucket: avatars (public)
- Path: {userId}/avatar.{ext}
- RLS policies: upload/update solo owner, view pubblico

### File creati/modificati
- app/(client)/account/page.tsx — pagina profilo buyer (nome, email, foto, data nascita, sesso)
- app/(client)/my-plans/page.tsx — aggiunto link Account in alto a destra
- app/(expert)/profile/page.tsx — upload foto reale (sostituisce campo URL)

### Flusso completo
- Seller: Dashboard → Edit Profile → carica foto, compila profilo
- Buyer: My Plans → Account → carica foto, compila profilo

### Stato
- ✅ Upload avatar seller funzionante
- ✅ Upload avatar buyer funzionante
- ✅ Pagina profilo buyer (/account) con nome, email, data nascita, sesso
- ✅ Link Account in My Plans
- ⏳ Sistema recensioni reale — post validazione
- ⏳ Day 8 Stripe / Lemon Squeezy — post validazione
- ⏳ Day 10 Deploy Vercel — prossima sessione

## 📝 SESSION NOTES — Google OAuth

### Funzionalità aggiunte
- Login con Google su pagina /login
- Signup con Google su pagina /signup
- Bottone "Continue with Google" con logo SVG ufficiale su entrambe le pagine

### Configurazione
- Google Cloud Console: progetto "Malyte" creato, OAuth client ID configurato
- Authorized JavaScript origins: http://localhost:3000
- Authorized redirect URIs: https://lmdcgzaotpxdnbldgwrp.supabase.co/auth/v1/callback
- Supabase: Google provider abilitato con Client ID e Client Secret
- Route callback: app/auth/callback/route.ts (già esistente)

### File modificati
- app/(public)/login/page.tsx — aggiunto bottone Google + divider "or"
- app/(public)/signup/page.tsx — aggiunto bottone Google + divider "or"

### Note per il deploy
- Quando si fa il deploy su Vercel, aggiungere anche l'URL di produzione in:
  - Google Cloud Console → Authorized JavaScript origins
  - Google Cloud Console → Authorized redirect URIs
  - Supabase non richiede modifiche (callback URL già corretto)

### Stato
- ✅ Google OAuth funzionante in locale
- ⏳ Aggiungere URL produzione in Google Cloud Console post-deploy
- ⏳ Day 8 Stripe / Lemon Squeezy — post validazione
- ⏳ Day 10 Deploy Vercel — prossima sessione

## 📝 SESSION NOTES — Sign out + Google OAuth completato

### Funzionalità aggiunte
- Tasto Sign out nella dashboard seller (Edit Profile · Sign out · + Create product)
- Tasto Sign out in My Plans buyer (Account · Sign out)

### File creati/modificati
- app/(expert)/dashboard/SignOutButton.tsx — nuovo componente client
- app/(expert)/dashboard/page.tsx — import e uso SignOutButton
- app/(client)/my-plans/SignOutButton.tsx — nuovo componente client
- app/(client)/my-plans/page.tsx — import e uso SignOutButton

### Stato
- ✅ Sign out funzionante per seller e buyer
- ✅ Google OAuth funzionante in locale
- ✅ Pagine login e signup con bottone "Continue with Google"
- ⏳ Aggiungere URL produzione in Google Cloud Console post-deploy
- ⏳ Day 8 Stripe / Lemon Squeezy — post validazione
- ⏳ Day 10 Deploy Vercel — prossima sessione

## 📝 SESSION NOTES — Lemon Squeezy integration (in corso)

### Obiettivo
Sostituire il fake Buy Now con checkout reale via Lemon Squeezy

### Configurazione completata
- Account Lemon Squeezy attivo, Test mode ON
- Store: Malyte (#347001)
- Prodotto creato su LS: "12-Week Nutrition Reset" (product_id: 993595, variant_id: 1559003)
- API key (Test): aggiornata nel .env dopo rigenerazione per sicurezza
- Webhook configurato: URL = https://app.malyte.com/api/lemonsqueezy/webhook, event = order_created
- Webhook secret: aggiornata nel .env (max 40 chars)

### Variabili .env aggiunte
- LEMONSQUEEZY_API_KEY
- LEMONSQUEEZY_STORE_ID=347001
- LEMONSQUEEZY_WEBHOOK_SECRET

### Database changes
- ALTER TABLE products ADD COLUMN lemonsqueezy_variant_id TEXT
- UPDATE products SET lemonsqueezy_variant_id = '1559003' WHERE title = '12-Week Nutrition Reset'

### File creati/modificati
- lib/lemonsqueezy.ts — client Lemon Squeezy con createLemonSqueezyCheckout
- app/api/create-checkout/route.ts — nuova route per creare checkout
- app/api/lemonsqueezy/webhook/route.ts — webhook handler (verifica firma + crea purchase nel DB)
- app/(public)/product/[id]/BuyNowButton.tsx — aggiornato per chiamare /api/create-checkout
- app/(public)/product/[id]/page.tsx — passa lemonsqueezy_variant_id al BuyNowButton

### Problema attuale
- Errore "The related resource does not exist" (404) quando si crea il checkout
- Il prodotto su LS risulta "pending" — potrebbe non essere ancora attivo
- Da investigare: navigare su app.lemonsqueezy.com/products per verificare stato prodotto

### Prossimi step
- Verificare che il prodotto sia Published su Lemon Squeezy
- Testare checkout end-to-end in test mode
- ⏳ Day 10 Deploy Vercel — prossima sessione

## 📝 SESSION NOTES — Lemon Squeezy Integration (completato)

### Problema risolto
- Errore 404 "The related resource does not exist" al checkout
- Causa: LEMONSQUEEZY_STORE_ID mancante nel .env del progetto
- Fix: aggiunta riga LEMONSQUEEZY_STORE_ID=347001 nel .env

### Fix tecnici
- lib/lemonsqueezy.ts — spostato lemonSqueezySetup() dentro la funzione (era a livello modulo, le env vars non erano disponibili)
- .env — aggiunta variabile LEMONSQUEEZY_STORE_ID=347001

### Test completato
- ✅ Checkout Lemon Squeezy funzionante in test mode
- ✅ Pagamento con carta test (4242...) completato
- ✅ Redirect a /my-plans dopo pagamento
- ✅ Prodotto "12-Week Nutrition Reset" Published su LS (€49, product_id: 993595, variant_id: 1559003)

### Webhook
- URL configurato: https://app.malyte.com/api/lemonsqueezy/webhook
- Non testabile in locale (punta a dominio produzione)
- Verrà testato automaticamente al deploy su Vercel

### Stato
- ✅ Lemon Squeezy integration completa
- ⏳ Day 10 Deploy Vercel — prossimo step
- ⏳ Verifica webhook in produzione post-deploy
- ⏳ Sistema recensioni reale — post validazione

## 📝 SESSION NOTES — Webhook ngrok test (completato)

### Problema risolto
- Webhook Lemon Squeezy non raggiungibile in locale
- Causa 1: middleware.ts bloccava le API routes → aggiunto `api/|` nel matcher
- Causa 2: header firma sbagliato → corretto a `x-signature`
- Causa 3: LEMONSQUEEZY_WEBHOOK_SECRET nel .env diverso da quello configurato su LS → allineati

### Fix tecnici
- middleware.ts → matcher aggiornato con `api/|` per escludere le API routes
- app/api/lemonsqueezy/webhook/route.ts → header corretto a `x-signature`
- .env → LEMONSQUEEZY_WEBHOOK_SECRET allineato con il secret di LS
- ngrok installato (ARM64) per testare webhook in locale

### Test completato
- ✅ ngrok tunnel funzionante
- ✅ Webhook riceve eventi da Lemon Squeezy
- ✅ Firma verificata correttamente (Match: true)
- ✅ Purchase creato nel DB dopo pagamento (10 records in purchases)

### Stato
- ✅ Lemon Squeezy integration completa end-to-end
- ✅ Webhook testato in locale con ngrok
- ⏳ Role-based signup — prossimo step
- ⏳ Day 10 Deploy Vercel — prossima sessione

## 📝 SESSION NOTES — Role-based signup

### Funzionalità aggiunte
- Selezione ruolo (Expert / Client) nella pagina /signup con card interattive
- Role salvato in profiles.role al momento della registrazione
- Middleware aggiornato: expert → /dashboard, client → /marketplace
- Protezione route incrociata: client non accede a route expert e viceversa
- MarketplaceNav: tasti Account e Sign out in alto a destra nel marketplace

### Database changes
- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client'
- UPDATE profiles SET role = 'expert' WHERE id IN (SELECT id FROM experts)

### File creati/modificati
- app/(public)/signup/page.tsx — selettore role + redirect immediato (confirm email off)
- app/auth/callback/route.ts — riscritto con @supabase/ssr, upsert profilo con role
- middleware.ts — riscritto con @supabase/ssr, redirect per role + protezione incrociata
- app/(public)/marketplace/MarketplaceNav.tsx — nuovo, navbar con Account + Sign out
- app/(public)/marketplace/page.tsx — aggiunto <MarketplaceNav />

### Note tecniche
- Usare @supabase/ssr (non auth-helpers-nextjs — non installato)
- cookies() richiede await nei route handler (Next.js 14+)
- Confirm email disattivato su Supabase per testing locale

### Stato
- ✅ Role-based signup completo e testato
- ✅ Marketplace navbar funzionante
- ⏳ Google OAuth: utenti Google ricevono role 'client' di default
- ⏳ Day 10 Deploy Vercel — prossima sessione

## 📝 SESSION NOTES — Client onboarding + Analytics country

### Funzionalità aggiunte
- Pagina /client-onboarding obbligatoria per nuovi utenti client
  - Campi: Full name, Date of birth, Sex, Country (tutti obbligatori)
  - Dopo il salvataggio → redirect a /marketplace
- Middleware aggiornato: client senza name o country → redirect a /client-onboarding
- WelcomeModal rimosso (sostituito dall'onboarding obbligatorio)
- Campo country aggiunto alla pagina /account (dropdown con lista paesi)
- Grafico Top Countries aggiunto alla tab Analytics della dashboard seller
- Font aggiornati su tutte le pagine: Syne → Satoshi, DM Sans → Inter
- Tab Analytics aggiunta nella dashboard seller (/dashboard?tab=analytics)
  - Revenue Trend, Age Distribution, Gender, Top Countries, Product Performance, Check-in Drop-off

### Database changes
- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT

### File creati/modificati
- app/(client)/client-onboarding/page.tsx — nuova pagina onboarding client
- app/(client)/my-plans/page.tsx — rimosso WelcomeModal
- app/(client)/my-plans/WelcomeModal.tsx — eliminato
- app/(client)/account/page.tsx — aggiunto campo country
- app/(expert)/dashboard/page.tsx — tab Analytics + grafico Top Countries
- middleware.ts — redirect a /client-onboarding per client senza profilo completo
- app/(public)/signup/page.tsx — redirect client a /client-onboarding invece di /marketplace
- app/layout.tsx — font Satoshi (Fontshare) + Inter (Google Fonts)
- app/globals.css — aggiornato font-family body e headings
- Tutti i file tsx/ts/css — Syne → Satoshi, DM Sans → Inter via sed

### Note tecniche
- Cartella rinominata da onboarding a client-onboarding per evitare conflitto con /(expert)/onboarding
- Satoshi viene da Fontshare (api.fontshare.com), non Google Fonts
- Inter viene da Google Fonts

### Stato
- ✅ Client onboarding obbligatorio funzionante
- ✅ Analytics con dati reali (country, age, gender, revenue, check-in)
- ✅ Font Satoshi + Inter su tutto il progetto
- ⏳ Day 10 Deploy Vercel — prossima sessione

## 📝 SESSION NOTES — Marketplace Home Redesign

### Funzionalità aggiunte
- Marketplace page completamente riscritta con nuova struttura user-friendly
- Hero dark con headline, search bar e goal pills cliccabili
- Sezione "How it works" con 3 step
- Expert cards con avatar iniziali, badge dinamici, conteggio clienti e piani
- Top products list con prezzo, categoria e durata
- CTA finale + footer dark
- Filtro per categoria via goal pills (URL param ?goal=)
- Ricerca per nome expert via search bar (URL param ?q=)

### File creati/modificati
- app/(public)/marketplace/page.tsx — riscritto completamente come server component
- app/(public)/marketplace/GoalPills.tsx — nuovo client component per filtro categoria
- app/(public)/marketplace/SearchBar.tsx — nuovo client component per ricerca

### Note tecniche
- createServerSupabaseClient richiede await (funzione asincrona)
- searchParams va tipizzato come Promise<{...}> e atteso con await (Next.js 14+)
- Badge calcolati lato server: Best Seller ≥5 clienti, Trending ≥10, Top Rated ≥20
- Avatar generati da iniziali con gradient viola/neon (nessuna colonna avatar nel DB)
- Colonne reali usate: experts (methodology_name, no tagline/avatar_url), products (duration_months, no duration_days)

### Stato
- ✅ Marketplace page live in locale
- ✅ Dati reali da Supabase (experts + products + purchases)
- ✅ Filtri goal pills e search bar funzionanti
- ⏳ Day 10 Deploy Vercel — prossima sessione

## 📝 SESSION NOTES — Marketplace redesign + Share Profile

### Funzionalità aggiunte
- Marketplace home completamente riscritta (Hero, How it works, Expert cards, Top products, CTA, Footer)
- GoalPills: filtro categoria via URL param ?goal=
- SearchBar: ricerca expert/prodotti via URL param ?q=
- Share Profile button nella navbar della dashboard seller (copia link /expert/[slug] con feedback "Copied! ✓")
- Traduzione completa app in inglese: signup/page.tsx

### File creati/modificati
- app/(public)/marketplace/page.tsx — riscritto come server component con dati reali
- app/(public)/marketplace/GoalPills.tsx — nuovo client component
- app/(public)/marketplace/SearchBar.tsx — nuovo client component
- app/(expert)/dashboard/ShareButton.tsx — nuovo client component
- app/(expert)/dashboard/page.tsx — aggiunto import e uso ShareButton
- app/(public)/signup/page.tsx — tradotto in inglese

### Note tecniche
- createServerSupabaseClient richiede await
- searchParams va tipizzato come Promise<{...}> e atteso con await (Next.js 14+)
- Colonne reali experts: methodology_name (no tagline/avatar_url)
- Colonne reali products: duration_months (no duration_days), price come DECIMAL
- Avatar expert generati da iniziali con gradient viola/neon

### Stato
- ✅ Marketplace page live in locale
- ✅ Share Profile funzionante
- ✅ App completamente in inglese
- ⏳ Client list nella dashboard — prossimo step
- ⏳ Day 10 Deploy Vercel — prossima sessione

## 📝 SESSION NOTES — Expert public page redesign + Social proof

### Funzionalità aggiunte
- Pagina pubblica expert (/expert/[slug]) completamente riscritta
- Hero potenziato: avatar grande con glow, badge categoria con icona, tagline/methodology come headline, CTA "Get your personalized plan →" nell'hero
- Social proof con 3 stat grandi su sfondo scuro (totalClients, avgWeek, engagedPct) subito sotto l'hero
- Banner metodologia con icona, nome e descrizione del metodo dell'expert
- Product cards ricche: badge "MOST POPULAR" sul primo, tag "AI-personalized for you", prezzo grande, bottone "Get this plan →"
- CTA sticky in basso sempre visibile durante lo scroll
- Share Profile button aggiunto nella navbar dashboard seller
- signup/page.tsx tradotto completamente in inglese

### File creati/modificati
- app/(public)/expert/[slug]/page.tsx — redesign completo
- app/(expert)/dashboard/ShareButton.tsx — nuovo client component
- app/(expert)/dashboard/page.tsx — import ShareButton
- app/(public)/marketplace/page.tsx — riscritto con GoalPills e SearchBar
- app/(public)/marketplace/GoalPills.tsx — nuovo
- app/(public)/marketplace/SearchBar.tsx — nuovo
- app/(public)/signup/page.tsx — tradotto in inglese

### Note tecniche
- I testi della metodologia appaiono in italiano perché inseriti in italiano durante i test — normale, dipende dai dati nel DB
- methodology_name e methodology_description mostrati nel banner — compilare su Supabase per expert reali
- CTA sticky usa position: fixed — funziona su tutti i browser moderni
- Stats social proof visibili solo se totalClients > 0

### Stato
- ✅ Marketplace home live
- ✅ Expert public page redesignata
- ✅ Share Profile funzionante
- ✅ App completamente in inglese (lato codice)
- ⏳ Deploy Vercel — prossima sessione
- ⏳ Client list nella dashboard seller — da fare
## 📝 SESSION NOTES — Giorno 10: Deploy Vercel (completato)

### Completato
- Push finale su GitHub: 42 file, tutti i moduli aggiornati
- .gitignore aggiornato: esclusi ngrok-arm.zip, ngrok.zip, ngrok, *.mov
- Progetto importato su Vercel (poulmalyte's projects → malyte-mvp)
- Variabili d'ambiente importate via "Import .env" su Vercel
- NEXTAUTH_URL aggiornata a https://malyte-mvp.vercel.app
- Supabase → Authentication → URL Configuration aggiornata:
  - Site URL: https://malyte-mvp.vercel.app
  - Redirect URLs: https://malyte-mvp.vercel.app/auth/callback
- Deploy completato in 42 secondi — Status: Ready ✅
- Test end-to-end: login → dashboard expert → marketplace — tutto funzionante

### URL produzione
- App live: https://malyte-mvp.vercel.app
- Login: https://malyte-mvp.vercel.app/login
- Marketplace: https://malyte-mvp.vercel.app/marketplace
- Dashboard: https://malyte-mvp.vercel.app/dashboard

### Dati verificati in produzione
- Revenue: €738.00 — Clienti: 1 — Prodotti live: 7

### Aperto — prossimi step
- ⏳ Aggiornare webhook Lemon Squeezy con URL produzione: https://malyte-mvp.vercel.app/api/lemonsqueezy/webhook
- ⏳ Google OAuth in produzione: aggiungere https://malyte-mvp.vercel.app in Google Cloud Console
- ⏳ Dominio personalizzato app.malyte.com — configurare su Vercel → Domains
- ⏳ Client list nella dashboard seller
- ⏳ Sistema recensioni reale — post validazione
