import './globals.css'
import localFont from 'next/font/local'

// UTM Aptima custom font
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
})

export const metadata = {
  metadataBase: new URL('https://www.dansenak249.com'),
  title: 'Dan (@dansenak249) | Technical Artist & Game Developer',
  description: 'Dan - Technical Artist specializing in Digital Arts, Visual FX & Animation, Game Development',
  openGraph: {
    title: 'Dan | Technical Artist',
    description: 'Portfolio showcase',
    url: 'https://www.dansenak249.com',
    siteName: 'Dan Portfolio',
    images: [
      {
        url: '/web-preview.png',
        width: 1200,
        height: 630,
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dan | Technical Artist',
    description: 'Portfolio showcase',
    images: ['/web-preview.png'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={utmAptima.variable}>
      <head>
        <script src="/spine-webgl.js" defer />
      </head>
      <body className={utmAptima.className}>
        {children}
      </body>
    </html>
  )
}