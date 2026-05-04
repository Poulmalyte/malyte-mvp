'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get('q') || '')

  useEffect(() => {
    setValue(searchParams.get('q') || '')
  }, [searchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim()) {
      params.set('q', value.trim())
    } else {
      params.delete('q')
    }
    router.push(`/marketplace?${params.toString()}`)
  }

  return (
    <form
      onSubmit={handleSearch}
      style={{
        display: 'flex',
        alignItems: 'center',
        background: '#FFFFFF',
        border: '1.5px solid #E8EDF8',
        borderRadius: '14px',
        padding: '6px 6px 6px 20px',
        width: '100%',
        maxWidth: '560px',
        gap: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <span style={{ fontSize: '16px', opacity: 0.4 }}>🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search experts, methods, goals..."
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#0F172A',
          fontSize: '15px',
          fontFamily: 'Inter, sans-serif',
        }}
      />
      <button
        type="submit"
        style={{
          background: '#7C5CFC',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          padding: '10px 22px',
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Search
      </button>
    </form>
  )
}