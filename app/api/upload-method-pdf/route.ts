import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verifica autenticazione
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'Nessun file ricevuto' }, { status: 400 })

  // Validazione tipo file
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Solo file PDF accettati' }, { status: 400 })
  }

  // Upload su Supabase Storage
  const fileName = `${user.id}/${Date.now()}_${file.name}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await supabase.storage
    .from('method-pdfs')
    .upload(fileName, buffer, { contentType: 'application/pdf' })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Aggiorna array method_pdfs_urls sul profilo expert
  const { data: expert } = await supabase
    .from('experts')
    .select('method_pdfs_urls')
    .eq('id', user.id)
    .single()

  const currentUrls = expert?.method_pdfs_urls || []
  const newUrls = [...currentUrls, fileName]

  await supabase
    .from('experts')
    .update({ method_pdfs_urls: newUrls })
    .eq('id', user.id)

  return NextResponse.json({ success: true, fileName, totalPdfs: newUrls.length })
}