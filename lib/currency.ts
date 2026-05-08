export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', JP: 'JPY', CA: 'CAD', AU: 'AUD',
  CH: 'CHF', CN: 'CNY', SE: 'SEK', NO: 'NOK', DK: 'DKK',
  PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN',
  HR: 'HRK', TR: 'TRY', BR: 'BRL', MX: 'MXN', IN: 'INR',
  KR: 'KRW', SG: 'SGD', HK: 'HKD', NZ: 'NZD', ZA: 'ZAR',
}

export function getCurrencyFromCountry(country: string | null | undefined): string {
  if (!country) return 'EUR'
  return COUNTRY_TO_CURRENCY[country] ?? 'EUR'
}

export function formatPrice(amount: number, currency: string, rate: number = 1): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount * rate)
}