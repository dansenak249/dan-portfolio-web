'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/commission')
  }, [router])

  return (
    <div className="min-h-screen bg-[#dadef0] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff69b4]" />
        <p className="mt-4 text-[#a7a7a7]">Redirecting...</p>
      </div>
    </div>
  )
}