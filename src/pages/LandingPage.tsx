import { ArrowRight, BadgeCheck, Building2, ChevronRight, Leaf, MapPin, Recycle, Search, ShieldCheck, Truck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '../components/ui/button'

const categories = [
  { name: 'Food', description: 'Meals, pantry stock, and surplus essentials', icon: Leaf },
  { name: 'Clothes', description: 'Reusable garments and household items', icon: Recycle },
  { name: 'Books', description: 'Textbooks, learning resources, and libraries', icon: BadgeCheck },
  { name: 'Furniture', description: 'Tables, chairs, and practical home goods', icon: Building2 },
]

const features = [
  {
    title: 'Resource discovery',
    description: 'Find available surplus goods near the required demand zone with a cleaner and faster matching workflow.',
    icon: Search,
  },
  {
    title: 'Trusted exchange flow',
    description: 'Track resource requests, approval outcomes, transaction readiness, and QR verification in one system.',
    icon: ShieldCheck,
  },
  {
    title: 'Supply-chain visibility',
    description: 'Coordinate availability, requests, approval events, pickup, and completion with measurable operational flow.',
    icon: Truck,
  },
  {
    title: 'Community impact',
    description: 'Promote reuse, reduce waste, and support sustainability outcomes across urban neighborhoods.',
    icon: Users,
  },
]

const stats = [
  { label: 'Resources connected', value: '12.4K' },
  { label: 'Active exchanges', value: '3.6K' },
  { label: 'Waste avoided', value: '46.8T' },
  { label: 'Citizen partners', value: '2.1K' },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white">
              S
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-700">
                SUREN
              </p>
              <p className="text-sm text-slate-600">Smart Urban Resource Exchange Network</p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#problem" className="transition hover:text-slate-900">Problem</a>
            <a href="#how-it-works" className="transition hover:text-slate-900">How it works</a>
            <a href="#categories" className="transition hover:text-slate-900">Categories</a>
            <a href="#features" className="transition hover:text-slate-900">Features</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Digital resource coordination
              </span>
              <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Connect what is available with what is needed.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-slate-600">
                SUREN is a digital resource exchange and coordination platform that helps communities discover,
                share, track and reuse valuable urban resources.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to="/register">
                  <Button size="lg" className="gap-2">
                    Explore Resources
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg">
                    Get Started
                  </Button>
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Local demand visibility
                </div>
                <div className="flex items-center gap-2">
                  <Recycle className="h-4 w-4 text-emerald-600" />
                  Circular reuse
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-100 via-white to-slate-100 p-5">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">This week</p>
                      <p className="text-3xl font-bold text-slate-900">2,485</p>
                    </div>
                    <div className="rounded-xl bg-emerald-600/10 p-3 text-emerald-700">
                      <Leaf className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-sm text-slate-500">Available</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">1,260</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-sm text-slate-500">Pending</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">184</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-500">Top demand zones</p>
                      <span className="text-xs font-medium text-emerald-700">Live</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {['Andheri', 'Nashik', 'Pune', 'Nagpur'].map((place, index) => (
                        <div key={place} className="flex items-center justify-between text-sm text-slate-600">
                          <span>{place}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${72 + index * 8}%` }}
                              />
                            </div>
                            <span>{72 + index * 8}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="problem" className="bg-slate-900 py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">The problem</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                Urban communities often have surplus resources that remain unused while others face urgent shortages.
              </h2>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                'Limited visibility into local surplus supply',
                'Manual and fragmented coordination between providers and seekers',
                'Low traceability for pickup, verification, and reuse impact',
              ].map((point) => (
                <div key={point} className="rounded-2xl border border-slate-700 bg-slate-800 p-6 text-slate-200">
                  {point}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">How SUREN works</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">From resource listing to verified pickup</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-5">
            {[
              'Provider lists surplus resource',
              'Seeker searches and filters',
              'Request is reviewed',
              'Pickup is prepared and verified',
              'Transaction is completed',
            ].map((step, index) => (
              <div key={step} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                  {index + 1}
                </div>
                <p className="text-base font-medium text-slate-800">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="categories" className="bg-slate-100 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Resource categories</p>
                <h2 className="mt-3 text-3xl font-bold text-slate-900">Urban resources with real reuse potential</h2>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {categories.map(({ name, description, icon: Icon }) => (
                <div key={name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-slate-900">{name}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Platform features</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Designed for visibility, trust, and reuse</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-emerald-950 py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-end">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">Sustainability impact</p>
                <h2 className="mt-4 text-3xl font-bold">Every exchange contributes toward stronger resource reuse.</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {stats.map(({ label, value }) => (
                  <div key={label} className="rounded-2xl border border-emerald-800 bg-emerald-900/60 p-5">
                    <p className="text-3xl font-bold">{value}</p>
                    <p className="mt-2 text-sm text-emerald-200">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm md:flex-row md:items-center md:justify-between md:text-left">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Ready to coordinate demand and supply</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">Build a more resilient urban resource network.</h2>
            </div>
            <Link to="/register">
              <Button size="lg" className="gap-2">
                Join SUREN
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
              S
            </div>
            <span className="font-semibold text-slate-900">SUREN</span>
          </div>
          <p>Smart Urban Resource Exchange Network</p>
          <p>Digital coordination for reuse and community resilience</p>
        </div>
      </footer>
    </div>
  )
}
