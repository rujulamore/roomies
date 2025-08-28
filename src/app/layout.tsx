export const metadata = { title: 'RoomieBoard', description: 'Find compatible roommates' }
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
            <a href="/" className="font-semibold">RoomieBoard</a>
            <nav className="space-x-4 text-sm">
              <a href="/browse" className="hover:underline">Browse</a>
              <a href="/profile" className="hover:underline">My Profile</a>
              <a href="/messages" className="hover:underline hidden sm:inline">Messages</a>
              <a href="/matches" className="hover:underline">Top Matches</a>
              <a href="/requests" className="hover:underline">Requests</a>
              <a href="/appartments" className="hover:underline">Appartments</a>
              <a href="/signin" className="hover:underline">Sign in</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
