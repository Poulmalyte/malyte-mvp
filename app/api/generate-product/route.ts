import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Carica il profilo expert completo dal DB
    const { data: expert, error: expertError } = await supabase
      .from('experts')
      .select('*')
      .eq('id', user.id)
      .single()

    if (expertError || !expert) {
      return NextResponse.json({ error: 'Profilo expert non trovato' }, { status: 404 })
    }

    // Carica il prodotto dell'expert
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('expert_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const product = products?.[0]

    if (!product) {
      return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 })
    }

    // Costruisce il contesto SOLO con i dati forniti dall'expert
    const expertContext = `
DATI FORNITI DALL'EXPERT — USA SOLO QUESTI, MAI INVENTARE:

Nome: ${expert.name}
Categoria: ${expert.category}
Nome del metodo: ${expert.methodology_name || 'NON SPECIFICATO'}
Descrizione metodologia: ${expert.methodology_description || 'NON SPECIFICATO'}
Risultati descritti dall'expert: ${expert.results_description || 'NON SPECIFICATO'}

PRODOTTO DA ARRICCHIRE:
Titolo: ${product.title}
Descrizione: ${product.description}
Prezzo: €${product.price}
Modello: ${product.pricing_model}
    `.trim()

    const systemPrompt = `Sei un assistente specializzato nella creazione di prodotti digitali per professionisti del benessere.

REGOLE ASSOLUTE — RISPETTALE SEMPRE:
1. USA SOLO le informazioni fornite dall'expert nel contesto. MAI aggiungere informazioni esterne.
2. Se un'informazione non è presente nei dati forniti, scrivi esattamente: "Da specificare dall'expert"
3. NON aggiungere consigli generici, best practice del settore, o teorie non menzionate dall'expert
4. NON inventare numeri, percentuali, o durate che l'expert non ha specificato
5. NON usare termini tecnici che l'expert non ha usato
6. Ogni sezione deve riflettere SOLO il modo di lavorare di questo specifico expert
7. Il tono e il linguaggio devono rispecchiare quello usato dall'expert nella sua descrizione

OBIETTIVO: Strutturare e arricchire i dati dell'expert in un formato prodotto chiaro, senza aggiungere nulla che non provenga direttamente dall'expert stesso.

Rispondi SOLO con un oggetto JSON valido, senza markdown, senza backtick, senza testo aggiuntivo.`

    const userPrompt = `${expertContext}

Crea il contenuto strutturato del prodotto digitale basandoti ESCLUSIVAMENTE sui dati forniti sopra.

Restituisci SOLO questo JSON (nessun testo aggiuntivo):
{
  "product_name": "${product.title}",
  "tagline": "Una frase che descrive il prodotto usando LE PAROLE DELL'EXPERT dalla sua descrizione metodologia",
  "what_you_get": [
    "Elemento 1 — estratto DIRETTAMENTE dalla metodologia dell'expert",
    "Elemento 2 — estratto DIRETTAMENTE dalla metodologia dell'expert"
  ],
  "methodology_principles": [
    {
      "title": "Principio estratto dalle parole dell'expert",
      "description": "Spiegazione usando SOLO le parole dell'expert",
      "source": "Estratto da: [citazione esatta dall'expert]"
    }
  ],
  "expected_results": [
    {
      "result": "Risultato descritto LETTERALMENTE dall'expert",
      "source": "Estratto da: results_description dell'expert"
    }
  ],
  "program_structure": {
    "duration": "Da specificare dall'expert",
    "frequency": "Da specificare dall'expert",
    "phases": []
  },
  "for_who": "Descrizione del cliente ideale basata SOLO su ciò che l'expert ha indicato",
  "not_for_who": "Da specificare dall'expert",
  "generation_notes": "Sezioni segnate come 'Da specificare dall'expert' richiedono integrazione da parte tua prima della pubblicazione"
}`

    // Chiama Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Pulisce la risposta e parsifica il JSON
    const cleanedResponse = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()

    let generatedContent
    try {
      generatedContent = JSON.parse(cleanedResponse)
    } catch {
      return NextResponse.json({
        error: 'Errore nel parsing della risposta AI',
        raw: responseText
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      product_id: product.id,
      generated_content: generatedContent,
    })

  } catch (error) {
    console.error('Errore generate-product:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}