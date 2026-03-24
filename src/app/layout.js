import './globals.css'
import localFont from 'next/font/local'
import Script from 'next/script'

const utmAptima = localFont({
  src: [
    {
      path: '../fonts/UTM Aptima.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/UTM AptimaBold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../fonts/UTM AptimaItalic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../fonts/UTM AptimaBoldItalic.ttf',
      weight: '700',
      style: 'italic',
    },
  ],
  variable: '--font-utm-aptima',
  display: 'swap',
  preload: true,
})

export const metadata = {
  metadataBase: new URL('https://dansenak249.com'),

  title: 'Dan (@dansenak249) | 2D Animator, Illustrator & Technical Artist',

  description:
    'Vietnamese digital artist & technical artist. Commissions open for anime illustration, 2D animation, animated stream overlays, VTuber assets, and Unity shader/VFX development. Book via VGen or direct.',

  alternates: {
    canonical: 'https://dansenak249.com',
  },

  openGraph: {
    title: 'Dan (@dansenak249) | 2D Animator, Illustrator & Technical Artist',
    description:
      'Commissions open — anime illustration, 2D animation, stream overlays, VTuber assets, and Unity VFX. Book via VGen or direct.',
    url: 'https://dansenak249.com',
    siteName: 'Dan — Technical Artist Portfolio',
    images: [
      {
        url: '/web-preview.png',
        width: 1200,
        height: 630,
        alt: 'Dan (@dansenak249) — Technical Artist Portfolio Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    creator: '@dansenak249',
    title: 'Dan (@dansenak249) | 2D Animator, Illustrator & Technical Artist',
    description:
      'Commissions open — anime illustration, 2D animation, stream overlays, VTuber assets, and Unity VFX.',
    images: ['/web-preview.png'],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Duy Anh Nguyen',
  alternateName: ['Dan', 'dansenak249', 'dan.senak249', 'senak249'],
  url: 'https://dansenak249.com',
  image: 'https://dansenak249.com/web-preview.png',
  jobTitle: 'Technical Artist',
  description:
    'Vietnamese digital artist and technical artist specializing in anime illustration, 2D animation, VTuber assets, stream overlays, and Unity shader/VFX development.',
  knowsAbout: [
    'Anime Illustration',
    '2D Animation',
    'Motion Graphics',
    'Live2D',
    'Spine2D',
    'After Effects',
    'Unity Shader Development',
    'HLSL',
    'Shader Graph',
    'VFX Graph',
    'VTuber Assets',
    'Stream Overlays',
    'Stream Alerts',
  ],
  sameAs: [
    'https://x.com/dansenak249',
    'https://www.facebook.com/dansenak249',
    'https://vgen.co/dansenak249',
  ],
  nationality: {
    '@type': 'Country',
    name: 'Vietnam',
  },
  makesOffer: [
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'Anime Illustration Commission',
        description: 'Custom anime-style character illustrations and concept art.',
      },
    },
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: '2D Animation Commission',
        description:
          'Animated illustrations, character animation, and motion graphics loops using Live2D, Spine2D, and After Effects.',
      },
    },
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'VTuber & Stream Asset Creation',
        description:
          'VTuber model artwork, animated stream overlays, alerts, transitions, and full stream packages.',
      },
    },
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'Unity Shader & VFX Development',
        description:
          'Custom shaders in HLSL and Shader Graph for Unity URP, plus VFX Graph particle systems for indie games.',
      },
    },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${utmAptima.variable}`}>
      <head>
        <Script src="/spine-webgl.js" strategy="beforeInteractive" />
        {/* JSON-LD Structured Data for SEO & AI */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-aptima">{children}</body>
    </html>
  )
}
