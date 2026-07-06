# Malyte Weekly Dashboard — Card Architecture (v1)

Sistema category-agnostic: la struttura è identica per skincare, supplementi, fitness,
nutrizione, sleep, longevity. Cambia solo il contenuto generato per ogni carta, mai
i nomi dei campi o la struttura.

---

## 1. Status Ring (Hero)
- Scopo: risposta in 3 secondi — dove sono, sto andando bene?
- Priorità: Critical
- Fonte: backend (numero settimana) + AI inference (parola-stato)
- Appare: sempre, dalla week 1
- Scompare: mai
- Evoluzione: anello vuoto (wk1, "Your journey begins") → pieno (wk12, "Foundation complete")
- Espandibile: no
- Azioni: no

## 2. Coach Note
- Scopo: prova che il sistema ha letto il check-in precedente
- Priorità: Critical
- Fonte: AI inference dal check-in precedente
- Appare: sempre
- Evoluzione: wk1 anticipazione → wk2+ riconoscimento esplicito di un dato reale
- Espandibile: no (se serve espandere, è troppo lunga)
- Azioni: no

## 3. Progress Trend
- Scopo: direzione del cambiamento nel tempo (category-agnostic: Skin Evolution /
  Energy Trend / Recovery Trend / Sleep Trend / Nutrition Progress secondo dominio)
- Priorità: High
- Fonte: check-in comparati tra settimane (self-report)
- Appare: dalla week 2 (serve baseline)
- Evoluzione: un punto (wk2) → linea/storico (wk3+)
- Espandibile: sì — storico settimana per settimana
- Vincolo: MAI percentuali o numeri inventati, solo transizioni di categoria o direzione

## 4. Weekly Mission
- Scopo: l'unica azione della settimana
- Priorità: Critical
- Fonte: AI inference (obiettivo + stato attuale)
- Appare: sempre
- Evoluzione: wk1 costruire abitudine → centrali raffinare tecnica → finali padroneggiare
- Espandibile: leggermente (dettaglio su come farla bene)
- Azioni: sì — checkbox di impegno/completamento

## 5. Routine / Protocol Cards
- Scopo: il "cosa fare" come carte tappabili, non un paragrafo
- Priorità: Critical
- Fonte: products/backend (prodotti acquistati) + AI inference (istruzioni)
- Appare: sempre
- Espandibile: sì — pattern centrale, collassate di default
- Azioni: sì — checkbox che alimenta la Consistency Card

## 6. Consistency Card
- Scopo: unica metrica oggettiva e onesta del sistema
- Priorità: High
- Fonte: backend, calcolata (mai dal modello)
- Appare: dalla week 2
- Espandibile: sì — storico settimanale
- Dipendenza: alimentata dalle checkbox delle Routine Cards

## 7. AI Observations (System Learning)
- Scopo: rendere visibile l'apprendimento — leva di retention #1, ma solo se reale
- Priorità: High
- Fonte: AI inference su storico di 2+ check-in
- Appare: dalla week 3 (prima non esiste un pattern vero)
- Espandibile: no
- Azioni: no

## 8. Milestones / Achievements
- Scopo: i "capitoli" del percorso a 12 settimane
- Priorità: Medium
- Fonte: backend (struttura del percorso: wk1, wk4, wk6, wk12)
- Appare: solo quando si sblocca qualcosa
- Espandibile: sì — collezione badge
- Azioni: eventuale condivisione

## 9. Next Week Preview
- Scopo: la ragione per tornare
- Priorità: High
- Fonte: AI inference + products (cadenza)
- Appare: sempre
- Vincolo: mai vendita a freddo, sempre motivato dai dati

## 10. Safety Flag (Warning)
- Scopo: gestire con cura reazioni o segnali di allarme
- Priorità: Critical quando presente, altrimenti assente
- Fonte: check-in (reazione riportata, aderenza crollata)
- Appare: solo quando i dati lo richiedono
- Vincolo: mai claim medici, tono calmo, mai simbolo d'allarme rosso

## 11. Check-in CTA
- Scopo: il ponte verso la settimana successiva — chiude il loop
- Priorità: Critical (è il motore del business)
- Fonte: backend (scheduled_checkins)
- Appare: sempre, cambia stato (locked → available → completed)
- Azioni: sì — l'azione più importante della dashboard

---

## Carte deliberatamente escluse
- Future Predictions / "skin age in 4 weeks": impossibile onesto, rischio claim medico
- Wellness Score 0-100: numero composito finto, rischio di sembrare inventato
- Scientific Explanations come sezione fissa: fusa dentro il "why" delle Routine Cards
- Habit Tracking come griglia separata: ridondante con Routine Cards + Consistency

## Ordine finale (scroll dall'alto)
1. Safety Flag (solo se presente)
2. Status Ring
3. Coach Note
4. Progress Trend (da wk2)
5. Consistency Card (da wk2)
6. AI Observations (da wk3)
7. Weekly Mission
8. Routine Cards
9. Milestones (quando sbloccate)
10. Next Week Preview
11. Check-in CTA
