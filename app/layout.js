import './globals.css'

export const metadata = {
  title: 'WorkWise - Where Skills Meet Jobs',
  description: 'Connect your skills with the perfect job opportunities',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}