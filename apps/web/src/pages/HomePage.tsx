import { ArrowRight, CalendarDays, FileCheck2, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
const features = [
  { icon: CalendarDays, title: 'One event workspace', text: 'Keep vendors, schedules, tasks and inspiration connected to the right event.' },
  { icon: FileCheck2, title: 'Comparable quotations', text: 'Request structured proposals and compare inclusions, deposits, terms and expiry dates.' },
  { icon: WalletCards, title: 'Visible commitments', text: 'Track agreed costs, payments, outstanding balances and the remaining event budget.' },
];
export function HomePage() {
  return <><section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_.9fr] lg:py-28">
    <div><p className="mb-4 text-sm font-medium uppercase tracking-[.22em] text-stone-500">Plan clearly. Celebrate fully.</p>
      <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-.04em] sm:text-7xl">Every vendor, decision and deadline—finally in one place.</h1>
      <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">A structured event-planning workspace for discovering trusted services, comparing quotations and coordinating the details without scattered chats and spreadsheets.</p>
      <div className="mt-9 flex flex-wrap gap-3"><Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-white">Start planning <ArrowRight size={17}/></Link><Link to="/vendors" className="rounded-full border border-stone-300 px-6 py-3">Browse vendors</Link></div>
    </div>
    <div className="grid min-h-[420px] grid-cols-2 gap-4 rounded-[2rem] bg-stone-900 p-4 text-white shadow-2xl shadow-stone-300"><div className="col-span-2 rounded-[1.5rem] bg-white/10 p-6 backdrop-blur"><p className="text-sm text-white/60">Wedding workspace</p><p className="mt-2 text-2xl font-medium">Aarav & Maya</p><p className="mt-16 text-5xl font-semibold">68%</p><p className="text-sm text-white/60">planning progress</p></div><div className="rounded-[1.5rem] bg-[#e7d9ca] p-5 text-stone-900"><p className="text-sm">Budget remaining</p><p className="mt-10 text-2xl font-semibold">LKR 485k</p></div><div className="rounded-[1.5rem] bg-white p-5 text-stone-900"><p className="text-sm">Next deadline</p><p className="mt-10 font-medium">Photography deposit</p><p className="text-sm text-stone-500">Due in 4 days</p></div></div>
  </section><section className="mx-auto max-w-7xl px-6 pb-24"><div className="grid gap-4 md:grid-cols-3">{features.map(({icon:Icon,title,text})=><article key={title} className="rounded-3xl border border-stone-200 bg-white p-7"><Icon/><h2 className="mt-10 text-xl font-semibold">{title}</h2><p className="mt-3 leading-7 text-stone-600">{text}</p></article>)}</div></section></>;
}
