import { Link } from 'react-router-dom';
import { Shield, FileCheck, Lightbulb, Users, ArrowRight, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { Button, Badge } from '../components/ui';
import { backendConfigured } from '../services/backendClient';

// ── Dashboard Preview ─────────────────────────────────────────────────────────
function ProductPreview() {
  return (
    <div className="relative w-full max-w-[360px] mx-auto lg:mx-0 select-none" aria-hidden="true">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-card-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
          <div>
            <p className="text-[11px] text-neutral-500">BenefitBridge demo</p>
            <p className="text-sm font-semibold text-neutral-800">Your benefits workspace</p>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
            <AlertCircle size={11} className="text-amber-600" />
            <span className="text-[11px] font-medium text-amber-700">Preliminary only</span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[
            'Add your profile information',
            'Review programme requirements',
            'Confirm details with the official source',
          ].map((item, index) => (
            <div key={item} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100 bg-neutral-50">
              <span className="w-6 h-6 rounded-full bg-navy-100 text-navy-700 text-xs grid place-items-center">{index + 1}</span>
              <span className="text-xs font-medium text-neutral-700">{item}</span>
            </div>
          ))}
          <p className="text-xs text-neutral-500 leading-relaxed">Illustrative interface preview, not a real eligibility result.</p>
        </div>
      </div>
    </div>
  );
}

// ── Trust items ───────────────────────────────────────────────────────────────
const trustItems = [
  { icon: Shield,    title: 'Source-first design',  desc: 'The current demo catalogue is illustrative; verify conditions and dates with the relevant authority.' },
  { icon: Lightbulb, title: 'Preliminary guidance',  desc: 'Eligibility is not guaranteed. Decisions are made by each scheme authority.' },
  { icon: FileCheck, title: 'Document privacy',     desc: backendConfigured ? 'Uploaded files are private to your authenticated account and are not officially verified.' : 'Secure document upload is not enabled in the demo; do not upload sensitive files.' },
  { icon: Users,     title: 'Your profile',         desc: backendConfigured ? 'Profile data is saved to your authenticated account.' : 'Demo profile data is saved only in this browser and is not protected by an account.' },
];

// ── How it works ──────────────────────────────────────────────────────────────
const steps = [
  { num: '01', title: 'Create your profile', desc: 'Tell us about your education, location, income and other relevant details. Takes about 5 minutes.' },
  { num: '02', title: 'Discover relevant benefits', desc: 'Your information is matched against available programs and eligibility requirements across education, finance, housing and more.' },
  { num: '03', title: 'Know what to do next', desc: 'See what you may qualify for, what is missing, upcoming deadlines, and clear next steps.' },
];

// ── Sample benefits ───────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="bg-neutral-25">

      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
              {backendConfigured ? 'Account required for saved activity' : 'Demo preview · No account required'}
            </div>

            <h1 className="text-4xl sm:text-[2.75rem] font-bold text-navy-900 leading-[1.1] tracking-tight mb-5">
              Find the support<br />you may be eligible for.
            </h1>

            <p className="text-lg text-neutral-600 leading-relaxed mb-2 font-medium">
              One profile. Relevant benefits. Clear next steps.
            </p>
            <p className="text-base text-neutral-500 leading-relaxed mb-8">
              Tell us a little about yourself. BenefitBridge helps you discover relevant benefits, understand eligibility, and know what to do next.
            </p>

            <div className="flex flex-wrap gap-3 mb-5">
              <Link to="/onboarding">
                <Button size="lg" icon={<ArrowRight size={18} />} iconPosition="right">
                  Check my eligibility
                </Button>
              </Link>
              <Link to="/search">
                <Button size="lg" variant="secondary">
                  Explore benefits
                </Button>
              </Link>
            </div>

            <p className="text-xs text-neutral-400">
                Current scheme examples and eligibility details are unverified. Confirm all information with the official authority.
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* ── Trust section ── */}
      <section id="about" className="border-y border-neutral-200 bg-white" aria-labelledby="trust-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="text-center mb-10">
            <h2 id="trust-heading" className="text-2xl font-bold text-navy-900">Built for clarity. Designed for people.</h2>
            <p className="mt-2 text-neutral-500 text-sm max-w-lg mx-auto">
              Not a government portal. Not a chatbot. A tool that actually helps you navigate public benefits.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {trustItems.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-navy-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-800 mb-1">{title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-xs text-neutral-400 max-w-2xl mx-auto">
            BenefitBridge provides information and eligibility guidance. Final eligibility and approval are determined by the respective program authority. We are not affiliated with any government body.
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20" aria-labelledby="hiw-heading">
        <div className="text-center mb-12">
          <h2 id="hiw-heading" className="text-3xl font-bold text-navy-900">How it works</h2>
          <p className="mt-3 text-neutral-500 max-w-md mx-auto">Three steps to find the support you deserve.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div key={step.num} className="relative bg-white rounded-2xl border border-neutral-200 p-7 shadow-card">
              <div className="text-5xl font-bold text-neutral-100 mb-4 leading-none select-none">{step.num}</div>
              <h3 className="text-base font-semibold text-neutral-900 mb-2">{step.title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{step.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-4 w-8 h-8 bg-white border border-neutral-200 rounded-full items-center justify-center z-10 shadow-card">
                  <ChevronRight size={14} className="text-neutral-400" />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/onboarding">
            <Button size="lg">Get started — it's free</Button>
          </Link>
        </div>
      </section>

      {/* ── Benefits section ── */}
      <section className="bg-white border-y border-neutral-200" aria-labelledby="benefits-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 id="benefits-heading" className="text-3xl font-bold text-navy-900">Benefits that match your situation</h2>
              <p className="mt-2 text-neutral-500 text-sm">A sample of what BenefitBridge can find for you.</p>
            </div>
            <Link to="/search">
              <Button variant="secondary" size="sm" icon={<ArrowRight size={14} />} iconPosition="right">
                View all benefits
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="font-semibold text-amber-900">Sample benefit records are not verified</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-amber-800">
              This project currently contains illustrative catalogue data for interface development. It is not a verified list of government programmes; eligibility, amounts, deadlines, and application links must be confirmed with official sources.
            </p>
            <Link to="/search" className="inline-block mt-4">
              <Button variant="secondary">Explore the demo catalogue</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Eligibility preview ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20" aria-labelledby="elig-heading">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 id="elig-heading" className="text-3xl font-bold text-navy-900 mb-4">Understand exactly why you qualify</h2>
            <p className="text-neutral-500 leading-relaxed mb-6">
              BenefitBridge doesn't just show you a list. It explains each eligibility condition against your profile, so you know what you meet, what's missing, and what to do next.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Condition-by-condition eligibility breakdown',
                'Clear explanation of missing requirements',
                'Document checklist with current status',
                'Direct link to the official application source',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-neutral-700">
                  <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/onboarding">
              <Button size="lg">Check my eligibility</Button>
            </Link>
          </div>

          {/* Eligibility assessment states */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-card-lg p-6" aria-hidden="true">
            <div className="mb-4">
              <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium mb-1">Eligibility assessment</p>
              <h3 className="text-base font-semibold text-neutral-900">Clear results, no guesswork</h3>
            </div>
            <p className="text-xs text-neutral-500 mb-4 pb-4 border-b border-neutral-100">
              Results appear only when verified scheme conditions can be compared with your profile.
            </p>
            <div className="space-y-0">
              {[
                { label: 'Condition matched', detail: 'Your provided information meets this rule.', icon: CheckCircle, color: 'text-emerald-500' },
                { label: 'More information needed', detail: 'A required profile detail is missing.', icon: AlertCircle, color: 'text-amber-500' },
                { label: 'Mandatory condition not met', detail: 'A required scheme condition is not satisfied.', icon: AlertCircle, color: 'text-red-500' },
              ].map(({ label, detail, icon: Icon, color }) => (
                <div key={label} className="flex items-start gap-3 py-3 border-b border-neutral-100 last:border-0">
                  <Icon size={15} className={`${color} shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-700">{label}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-teal-50 border border-teal-100 rounded-lg">
              <p className="text-xs text-teal-800 font-medium">Preliminary guidance only</p>
              <p className="text-xs text-teal-700 mt-0.5">Final eligibility is determined by the scheme authority.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-navy-900 rounded-3xl px-8 py-14 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Ready to find your benefits?</h2>
          <p className="text-navy-300 mb-8 max-w-md mx-auto text-base">
            Create your profile in 5 minutes and see which programs you may be eligible for.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/onboarding">
              <Button size="lg" className="bg-white !text-navy-900 hover:bg-neutral-100 focus-visible:ring-white">
                Check my eligibility
              </Button>
            </Link>
            <Link to="/search">
              <Button size="lg" variant="ghost" className="!text-white hover:!bg-navy-800">
                Browse benefits
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-xs text-navy-500">
            BenefitBridge is an independent platform. We are not affiliated with any government body.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-neutral-200 bg-white" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-navy-700 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                  <rect x="3" y="5" width="7" height="14" rx="1.5" fill="white" opacity="0.95"/>
                  <rect x="12" y="5" width="9" height="9" rx="1.5" fill="#2a9a8b"/>
                </svg>
              </div>
              <span className="font-semibold text-navy-900 text-sm">BenefitBridge</span>
            </div>
            <p className="text-xs text-neutral-400 text-center max-w-sm">
              BenefitBridge is an independent platform. Information is provided for guidance only and does not constitute official eligibility determination.
            </p>
            <nav className="flex gap-4 text-xs text-neutral-500" aria-label="Footer navigation">
              <a href="#" className="hover:text-neutral-700 transition-colors">Privacy</a>
              <a href="#" className="hover:text-neutral-700 transition-colors">Terms</a>
              <a href="#" className="hover:text-neutral-700 transition-colors">Contact</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
