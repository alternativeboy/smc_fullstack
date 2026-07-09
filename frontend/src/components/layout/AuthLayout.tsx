import { BarChart3, Database, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

const PILLS = [
  { icon: Sparkles, label: 'Grounded in the data' },
  { icon: Database, label: 'SQL you can see' },
  { icon: ShieldCheck, label: 'SELECT-only guardrails' },
  { icon: BarChart3, label: '49 companies · 2022–2025' },
];

const PARTICLES = [
  { top: '20%', left: '15%', delay: '0s' },
  { top: '35%', left: '75%', delay: '1.2s' },
  { top: '60%', left: '25%', delay: '2.4s' },
  { top: '75%', left: '65%', delay: '0.8s' },
  { top: '45%', left: '50%', delay: '3s' },
];

/** Split-screen dark auth shell (frontend/design/Login Page Redesign). Left = animated
 *  branding panel (hidden < lg), right = the form panel passed as children. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1419] font-inter text-[#f0f4f8]">
      {/* ── Left branding panel ── */}
      <section
        aria-hidden
        className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#0d1117_0%,#111b27_50%,#0f1e2a_100%)] p-16 lg:flex"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_600px_500px_at_20%_80%,rgba(47,208,127,0.07),transparent_70%),radial-gradient(ellipse_400px_400px_at_80%_20%,rgba(47,160,208,0.05),transparent_70%)]" />
        <div className="pointer-events-none absolute left-[-5%] top-[10%] h-[350px] w-[350px] animate-orb-float rounded-full bg-[rgba(47,208,127,0.12)] blur-[80px]" />
        <div className="pointer-events-none absolute bottom-[15%] right-[-5%] h-[280px] w-[280px] animate-orb-float rounded-full bg-[rgba(47,160,220,0.08)] blur-[80px] [animation-delay:-7s]" />
        <div className="pointer-events-none absolute left-[40%] top-[50%] h-[200px] w-[200px] animate-orb-float rounded-full bg-[rgba(100,220,160,0.06)] blur-[80px] [animation-delay:-14s]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(47,208,127,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(47,208,127,0.03)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" />
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="pointer-events-none absolute h-[3px] w-[3px] animate-particle rounded-full bg-[#2fd07f]"
            style={{ top: p.top, left: p.left, animationDelay: p.delay }}
          />
        ))}

        <div className="relative z-10 max-w-[480px] animate-in fade-in text-center duration-700">
          <div className="mb-12 inline-flex items-center gap-3.5">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2fd07f,#26b86e)] shadow-[0_8px_24px_rgba(47,208,127,0.25)]">
              <Layers className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Financial Chat</span>
          </div>

          <h2 className="mb-5 bg-[linear-gradient(135deg,#f0f4f8,#8899a6)] bg-clip-text text-[44px] font-extrabold leading-[1.15] tracking-[-1.5px] text-transparent">
            Smarter answers with{' '}
            <span className="bg-[linear-gradient(135deg,#2fd07f,#5be8a0)] bg-clip-text text-transparent">
              AI-powered
            </span>{' '}
            financial insights
          </h2>

          <p className="mb-12 text-[17px] leading-[1.7] text-[#8899a6]">
            Ask natural-language questions about the income statements of 49 U.S. public companies — answered
            only from the data, with the SQL shown.
          </p>

          <div className="flex flex-wrap justify-center gap-2.5">
            {PILLS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(47,208,127,0.1)] bg-[rgba(47,208,127,0.06)] px-[18px] py-2.5 text-[13px] font-medium text-[#8899a6] backdrop-blur"
              >
                <Icon className="h-4 w-4 text-[#2fd07f]" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <svg
          className="pointer-events-none absolute bottom-16 left-16 right-16 h-24 opacity-[0.12]"
          viewBox="0 0 800 100"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M0 80 Q100 60 200 65 T400 40 T600 55 T800 25"
            stroke="rgba(47,208,127,0.5)"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </section>

      {/* ── Right form panel ── */}
      <section className="relative flex w-full flex-col items-center justify-center border-l border-white/[0.06] bg-[#1a2332] p-10 sm:p-16 lg:w-[520px] lg:min-w-[520px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_400px_300px_at_20%_80%,rgba(47,208,127,0.04),transparent_70%)] lg:hidden" />
        <div className="relative z-10 w-full max-w-[380px]">{children}</div>
        <footer className="absolute bottom-8 left-0 right-0 text-center text-xs text-[#5c6d7e]">
          Financial Data Chat · grounded answers only
        </footer>
      </section>
    </div>
  );
}
