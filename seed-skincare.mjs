#!/usr/bin/env node
/**
 * Malyte E2E — Seed catalogo skincare su Shopify Development Store.
 *
 * USO:
 *   1) export SHOP="malyte-skincare-e2e.myshopify.com"
 *   2) export TOKEN="shpat_xxxxxxxxxxxxxxxxxxxxx"
 *   3) node seed-skincare.mjs
 *
 * Crea 8 prodotti skincare (attivi, pubblicati) con titolo, descrizione,
 * prezzo, immagine e product_type. Idempotente: se un prodotto con lo
 * stesso titolo esiste gia', lo salta.
 */

const SHOP = process.env.SHOP;
const TOKEN = process.env.TOKEN;
const API_VERSION = "2026-04";

if (!SHOP || !TOKEN) {
  console.error("ERRORE: esporta SHOP e TOKEN prima di lanciare.");
  console.error('  export SHOP="malyte-skincare-e2e.myshopify.com"');
  console.error('  export TOKEN="shpat_..."');
  process.exit(1);
}

const BASE = `https://${SHOP}/admin/api/${API_VERSION}`;
const HEADERS = {
  "X-Shopify-Access-Token": TOKEN,
  "Content-Type": "application/json",
};

const PRODUCTS = [
  {
    title: "Gel Detergente Purificante",
    body_html:
      "<p>Detergente viso quotidiano a base di niacinamide e aloe. Rimuove impurità e sebo in eccesso senza seccare la pelle. Adatto a tutti i tipi di pelle, ideale per pelli miste e grasse.</p><p><strong>Uso:</strong> mattina e sera, massaggiare sul viso umido e risciacquare.</p>",
    product_type: "Cleanser",
    price: "18.00",
    image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800",
  },
  {
    title: "Siero Vitamina C 15%",
    body_html:
      "<p>Siero antiossidante con vitamina C stabilizzata al 15% e acido ferulico. Illumina l'incarnato, uniforma il tono e protegge dallo stress ossidativo. Da usare al mattino.</p><p><strong>Uso:</strong> 3-4 gocce al mattino su pelle pulita, prima della crema e dell'SPF.</p>",
    product_type: "Serum",
    price: "42.00",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800",
  },
  {
    title: "Siero Retinolo 0.3% Notte",
    body_html:
      "<p>Trattamento notte con retinolo incapsulato allo 0.3%. Stimola il rinnovamento cellulare, attenua rughe sottili e migliora la texture. Introdurre gradualmente.</p><p><strong>Uso:</strong> la sera, 2-3 volte a settimana all'inizio, poi aumentare. Solo di notte.</p>",
    product_type: "Serum",
    price: "48.00",
    image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800",
  },
  {
    title: "Crema Idratante Riparatrice",
    body_html:
      "<p>Crema viso con ceramidi, acido ialuronico e burro di karité. Ripara la barriera cutanea e mantiene l'idratazione per 24 ore. Texture ricca ma non grassa.</p><p><strong>Uso:</strong> mattina e sera come ultimo step della routine (prima dell'SPF al mattino).</p>",
    product_type: "Moisturizer",
    price: "32.00",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800",
  },
  {
    title: "Protezione Solare SPF 50",
    body_html:
      "<p>Fluido solare viso ad ampio spettro SPF 50, finish invisibile senza residui bianchi. Protegge da UVA/UVB e luce blu. Base ideale sotto il make-up.</p><p><strong>Uso:</strong> ultimo step della routine mattutina, riapplicare ogni 2 ore in esposizione.</p>",
    product_type: "Sunscreen",
    price: "28.00",
    image: "https://images.unsplash.com/photo-1556229162-5c63ed9c4efb?w=800",
  },
  {
    title: "Contorno Occhi Illuminante",
    body_html:
      "<p>Crema contorno occhi con caffeina e peptidi. Riduce l'aspetto di borse e occhiaie, rassoda la zona perioculare. Texture leggera a rapido assorbimento.</p><p><strong>Uso:</strong> mattina e sera, picchiettare delicatamente sull'osso orbitale.</p>",
    product_type: "Eye Care",
    price: "26.00",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800",
  },
  {
    title: "Esfoliante AHA/BHA",
    body_html:
      "<p>Esfoliante chimico con acido glicolico (AHA) e acido salicilico (BHA). Leviga la texture, libera i pori e illumina. Da usare la sera, non insieme al retinolo.</p><p><strong>Uso:</strong> la sera 2 volte a settimana su pelle pulita, seguire con idratante. Non usare con retinolo la stessa sera.</p>",
    product_type: "Exfoliant",
    price: "34.00",
    image: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800",
  },
  {
    title: "Maschera Notte Nutriente",
    body_html:
      "<p>Maschera leave-on notturna con acido ialuronico, squalano e pantenolo. Nutre in profondità e rimpolpa la pelle durante il sonno. Al risveglio pelle più morbida.</p><p><strong>Uso:</strong> la sera 2-3 volte a settimana come ultimo step, lasciare in posa tutta la notte.</p>",
    product_type: "Mask",
    price: "30.00",
    image: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800",
  },
];

async function shopify(path, method = "GET", body = null) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : null,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  }
  return json;
}

async function getExistingTitles() {
  const data = await shopify("/products.json?limit=250&fields=id,title");
  return new Set((data.products || []).map((p) => p.title));
}

async function createProduct(p) {
  const payload = {
    product: {
      title: p.title,
      body_html: p.body_html,
      product_type: p.product_type,
      vendor: "Malyte Skincare",
      status: "active",
      published_scope: "web",
      images: [{ src: p.image }],
      variants: [
        { price: p.price, inventory_management: null, requires_shipping: true },
      ],
    },
  };
  const data = await shopify("/products.json", "POST", payload);
  return data.product;
}

(async () => {
  console.log(`\n== Seed catalogo skincare su ${SHOP} (API ${API_VERSION}) ==\n`);
  const existing = await getExistingTitles();
  let created = 0, skipped = 0;
  for (const p of PRODUCTS) {
    if (existing.has(p.title)) {
      console.log(`  SKIP  (esiste)  ${p.title}`);
      skipped++;
      continue;
    }
    try {
      const prod = await createProduct(p);
      console.log(`  OK    id=${prod.id}  €${p.price}  ${p.title}`);
      created++;
      await new Promise((r) => setTimeout(r, 600)); // rispetta rate limit
    } catch (e) {
      console.error(`  FAIL  ${p.title}\n        ${e.message}`);
    }
  }
  console.log(`\n== Fatto: ${created} creati, ${skipped} saltati, ${PRODUCTS.length} totali ==\n`);

  // Riepilogo finale
  const after = await shopify("/products.json?limit=250&fields=id,title,status,product_type");
  console.log("Catalogo attuale nello store:");
  for (const p of after.products) {
    console.log(`  - [${p.status}] ${p.title} (${p.product_type})`);
  }
  console.log("");
})();
