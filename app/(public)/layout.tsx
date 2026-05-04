import CookieBanner from '@/components/CookieBanner'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <CookieBanner />
    </>
  )
}