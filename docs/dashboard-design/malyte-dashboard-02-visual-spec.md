# Malyte Weekly Dashboard — Mobile Visual Spec

Canvas: 390x844 (iPhone 14/15). Safe area top 47px, bottom 34px. Content width 358px
(16px margini). Spacing tra carte: 12px. Padding interno carta: 20px.

## Palette
- Background: #FAFAF9 (off-white caldo, non clinico)
- Ink: #1C1C1E
- Muted: #8E8E93
- Accent: #5B6EF5 (indaco calmo, non neon)
- Success: #34C759
- Warning: #FF9F0A (ambra, mai rosso)
- Card bianca: #FFFFFF

## Tipografia (SF Pro)
- Display (headline): 28/34 bold
- Title: 20/25 semibold
- Body: 15/20 regular
- Caption: 12/16 medium, letter-spacing 0.02em, muted

---

## 1. Status Ring — altezza 220px
Anello centrato 140px diametro, stroke 8px, 12 segmenti con gap 2px.
Segmenti pieni #5B6EF5, vuoti #E5E5EA. Centro: "Week 5" (Title) / "of 12" (Caption muted).
Sotto l'anello: parola-stato, Body semibold, colore accent. Nessuna icona — l'anello è l'icona.
Animazione: segmenti si riempiono in sequenza al caricamento, stagger 60ms, ease-out.
Empty state (wk1): anello vuoto, pulse leggero solo sul primo segmento.

## 2. Coach Note — altezza ~120px, si adatta al contenuto
Card bianca, radius 16px, nessuna ombra — solo bordo 1px #F0F0F0 (flat).
Avatar 24px in alto a sinistra + Title accanto. Body sotto, max 3 righe, #3C3C43.
Nessuna espansione — se troncato, ellipsis, mai "leggi di più".
Loading: 3 righe grigie shimmer, pulse loop 1.2s.

## 3. Progress Trend — altezza 100px, assente wk1
Card orizzontale. Sinistra: label (Caption muted) + testo transizione grande
("Moderate → Mild", Title, ink). Destra: sparkline o freccia direzionale, 24px, accent.
Appare wk2 con fade-in 300ms. Tap: espande verso il basso (accordion 200ms) con
timeline a puntini dello storico.

## 4. Consistency Card — altezza 90px, assente wk1
Sinistra: numero grande "6/7" (Display, ink). Destra: freccia trend + Caption
"vs last week". Barra di progresso sottile 4px sotto, fill accent.
Tap espande in barre settimanali storiche.

## 5. AI Observations — altezza ~130px, assente wk1-2
Bordo con gradiente sottile 1px (#5B6EF5 → #9B8AFB) invece di bordo flat — segnala
"carta diversa". Icona scintilla 16px in alto a sinistra, colore accent.
Testo max 2-3 righe. Nessuna espansione, nessuna interazione.
Entrata: fade + scale leggero (0.97→1, 250ms) la prima volta che appare.

## 6. Weekly Mission — altezza 110px
Sfondo tinto accent #EEF0FE (non bianco — deve risaltare come "la cosa unica").
Azione su una riga, peso Title. Checkbox cerchio 28px a destra, tap riempie con
check + haptic leggero + animazione "settle" (scale 1.1→1, 150ms).
Sotto: una riga Caption con il "perché".

## 7. Routine Cards — altezza 64px collassate, lista
Ogni step: cerchio icona 40px (tinta sole/luna), titolo (Body semibold),
badge orario (pillola Caption, sfondo #F0F0F0). Chevron destra 16px muted.
Tap espande in-place con istruzioni + perché (accordion 200ms, le altre carte
scorrono sotto senza scatti). Checkbox visibile solo da espansa.
Divisori 0.5px #F0F0F0 tra carte collassate; da espansa, ombra 2px invece del divisore.

## 8. Milestones — altezza 0 salvo sblocco, poi 100px
Appare solo alla settimana di sblocco. Icona badge 32px (oro/accent duotone),
titolo, una riga. Entrata: scale 0.9→1 + fade, spring 400ms.
Dopo la prima visualizzazione, collassa in striscia orizzontale di badge raccolti (44px).

## 9. Next Week Preview — altezza 90px
Sfondo muted #F5F5F4, nessun bordo (recede visivamente). Icona freccia piccola,
label Caption "NEXT WEEK", testo Body sotto. Deliberatamente silenziosa — non deve
competere con la Weekly Mission.

## 10. Safety Flag — altezza 100px, condizionale, priorità massima se presente
Sfondo ambra #FFF8E8, bordo 1px #FFE4A3. Icona scudo (mai triangolo di allarme).
Tono calmo. Quando presente, si posiziona SOPRA lo Status Ring — unica carta che
rompe la gerarchia. Entrata slide-down 300ms.

## 11. Check-in CTA — altezza 80px
In fondo allo scroll, non sticky. Disponibile: bottone full-width fill accent,
testo bianco, radius 16px, "Complete this week's check-in →".
Locked: stile ghost/outline, testo muted "Check-in opens in 3 days", nessuna ombra.

---

## Regole globali
- Mai più di una carta con sfondo colorato visibile per schermata, tranne
  Weekly Mission + Safety Flag (le due che richiedono azione).
- Ombre vietate salvo il "lift" 2px sulla carta espansa — la flatness è il segnale di calma.
- Loading globale: le carte si caricano dall'alto man mano che i dati arrivano,
  ognuna con lo shimmer pattern — mai uno spinner a schermo intero.
- Se il contenuto supera ~2.2 schermate in una settimana qualsiasi, qualcosa
  sta occupando spazio che non dovrebbe.
