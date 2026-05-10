import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js'

export async function createLemonSqueezyCheckout({
  userId,
  userEmail,
  productId,
  price,
}: {
  userId: string
  userEmail: string
  productId: string
  price: number
}) {
  lemonSqueezySetup({
    apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  })

  const storeId = process.env.LEMONSQUEEZY_STORE_ID!
  const variantId = process.env.LEMONSQUEEZY_DEFAULT_VARIANT_ID!

  console.log('🍋 LS Checkout attempt:', { storeId, variantId, userId, price })

  const { data, error } = await createCheckout(
    storeId,
    variantId,
    {
      checkoutOptions: {
        embed: false,
        media: false,
      },
      checkoutData: {
        email: userEmail,
        custom: {
          user_id: userId,
          product_id: productId,
        },
      },
      customPrice: Math.round(price * 100),
      productOptions: {
        redirectUrl: `${process.env.NEXTAUTH_URL}/my-plans`,
        receiptButtonText: 'Go to my plans',
      },
    }
  )

  if (error) {
    console.error('🍋 LS Error:', JSON.stringify(error, null, 2))
    throw error
  }

  console.log('🍋 LS Checkout URL:', data?.data?.attributes?.url)
  return data?.data?.attributes?.url
}