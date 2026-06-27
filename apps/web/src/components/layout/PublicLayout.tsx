import { Link, Outlet } from 'react-router-dom';
export function PublicLayout() {
  return <div className="min-h-screen bg-[#fbfaf8] text-stone-900">
    <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#fbfaf8]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-lg font-semibold tracking-tight">Event Platform</Link>
        <nav className="flex items-center gap-5 text-sm"><Link to="/vendors">Vendors</Link><Link to="/how-it-works">How it works</Link><Link to="/login" className="rounded-full bg-stone-900 px-4 py-2 text-white">Log in</Link></nav>
      </div>
    </header>
    <main><Outlet /></main>
  </div>;
}
