import Link from "next/link";

export const metadata = {
  title: "About Us | Malyte",
  description:
    "We don't replace experts. We elevate their method. Malyte transforms professional methodology into a scalable, personalised system powered by AI.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F5F7FA] text-[#0D1525]">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pt-28 pb-24 md:pt-40 md:pb-32">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-40 h-[560px] w-[560px] rounded-full bg-[#7C5CFC] opacity-[0.07] blur-[130px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-20 right-0 h-[400px] w-[400px] rounded-full bg-[#4DFFD2] opacity-[0.07] blur-[110px]"
        />

        <div className="relative mx-auto max-w-3xl">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#7C5CFC]">
            About Malyte
          </p>
          <h1 className="font-syne text-4xl font-bold leading-[1.15] tracking-tight text-[#0D1525] md:text-6xl">
            We don't replace experts.{" "}
            <em className="not-italic text-[#7C5CFC]">
              We elevate their method.
            </em>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[#4A5568] md:text-xl">
            In a time where artificial intelligence is reshaping entire
            industries, we believe something essential must remain untouched:
            human expertise.
          </p>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#4A5568] md:text-xl">
            At Malyte, the method of a professional is not something to be
            replaced. It is the result of experience, intuition, real-world
            application and continuous refinement. It cannot be replicated by
            artificial intelligence.{" "}
            <span className="font-semibold text-[#0D1525]">
              It can only be extended.
            </span>
          </p>
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[#CBD5E0] to-transparent" />
      </div>

      {/* ── The limitation of time ────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl grid gap-16 md:grid-cols-[1fr_2fr] md:items-start">
          <div className="md:pt-1">
            <span className="font-syne text-sm font-semibold uppercase tracking-[0.18em] text-[#A0AEC0]">
              01
            </span>
            <h2 className="mt-3 font-syne text-2xl font-bold text-[#0D1525] md:text-3xl">
              The limitation of time
            </h2>
          </div>
          <div className="space-y-5 text-[#4A5568] leading-relaxed text-[1.0625rem]">
            <p>
              Today, professionals in wellness operate within a fundamental
              constraint. Their growth is directly tied to their availability.
            </p>
            <p className="border-l-2 border-[#7C5CFC] pl-5 text-[#0D1525] font-medium">
              Each client requires attention. Each result requires presence.
              <br />
              And while demand increases, time does not.
            </p>
            <p>
              This creates a ceiling that even the most skilled professionals
              cannot surpass.
            </p>
            <p>
              At the same time, most digital solutions attempt to solve this by
              simplifying, standardizing, or removing the human element
              entirely. The result is often impersonal, static and disconnected
              from real expertise.
            </p>
          </div>
        </div>
      </section>

      {/* ── A different approach ─────────────────────────────── */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-5xl grid gap-16 md:grid-cols-[1fr_2fr] md:items-start">
          <div className="md:pt-1">
            <span className="font-syne text-sm font-semibold uppercase tracking-[0.18em] text-[#A0AEC0]">
              02
            </span>
            <h2 className="mt-3 font-syne text-2xl font-bold text-[#0D1525] md:text-3xl">
              A different approach
            </h2>
          </div>
          <div className="space-y-5 text-[#4A5568] leading-relaxed text-[1.0625rem]">
            <p>Malyte is built on a different premise.</p>
            <div className="rounded-2xl bg-[#F5F7FA] border border-[#E2E8F0] p-6 space-y-3">
              <p className="text-[#0D1525] font-semibold">
                Technology should not replace the professional.
              </p>
              <p className="text-[#0D1525] font-semibold">
                It should execute their method with precision, consistency and
                scale.
              </p>
            </div>
            <p>
              We transform a professional's method into a structured system
              capable of delivering personalised experiences to every individual,
              while remaining fully aligned with the original logic and
              philosophy behind it.
            </p>
            <p>
              The role of artificial intelligence is not to decide instead of
              the expert, but to carry out what the expert has already defined.
            </p>
          </div>
        </div>
      </section>

      {/* ── Method as the core ──────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl grid gap-16 md:grid-cols-[1fr_2fr] md:items-start">
          <div className="md:pt-1">
            <span className="font-syne text-sm font-semibold uppercase tracking-[0.18em] text-[#A0AEC0]">
              03
            </span>
            <h2 className="mt-3 font-syne text-2xl font-bold text-[#0D1525] md:text-3xl">
              Method as the core
            </h2>
          </div>
          <div className="space-y-5 text-[#4A5568] leading-relaxed text-[1.0625rem]">
            <p>Everything starts from the method.</p>
            <p className="border-l-2 border-[#4DFFD2] pl-5 text-[#0D1525] font-medium leading-relaxed">
              The sequences, the rules, the adjustments, the reasoning.
              <br />
              What normally happens in a one-to-one interaction is translated
              into a system that preserves its integrity.
            </p>
            <div className="grid gap-4 sm:grid-cols-3 pt-2">
              {[
                {
                  label: "Each person",
                  desc: "receives a personalised output",
                },
                { label: "Each plan", desc: "evolves over time" },
                {
                  label: "Each result",
                  desc: "remains grounded in the professional's approach",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
                >
                  <p className="font-semibold text-[#0D1525] text-sm">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm text-[#718096]">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="font-semibold text-[#0D1525]">
              Nothing is generic. Nothing is detached.
            </p>
          </div>
        </div>
      </section>

      {/* ── Human-centered ───────────────────────────────────── */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-5xl grid gap-16 md:grid-cols-[1fr_2fr] md:items-start">
          <div className="md:pt-1">
            <span className="font-syne text-sm font-semibold uppercase tracking-[0.18em] text-[#A0AEC0]">
              04
            </span>
            <h2 className="mt-3 font-syne text-2xl font-bold text-[#0D1525] md:text-3xl">
              Human-centered by design
            </h2>
          </div>
          <div className="space-y-5 text-[#4A5568] leading-relaxed text-[1.0625rem]">
            <p>
              We believe that technology should adapt to people, not the
              opposite.
            </p>
            <div className="space-y-3">
              {[
                "The professional remains at the center.",
                "Their method remains the source of truth.",
                "Their expertise remains the differentiating factor.",
              ].map((line) => (
                <div key={line} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#7C5CFC]" />
                  <p className="text-[#0D1525] font-medium">{line}</p>
                </div>
              ))}
            </div>
            <p>
              Malyte simply removes the limitations of time, allowing that
              expertise to reach more people without dilution.
            </p>
          </div>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <span className="font-syne text-sm font-semibold uppercase tracking-[0.18em] text-[#A0AEC0]">
              05
            </span>
            <h2 className="mt-3 font-syne text-3xl font-bold text-[#0D1525] md:text-4xl">
              Our mission
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                text: "To enable professionals to scale their impact without compromising their identity.",
                accent: "#7C5CFC",
              },
              {
                text: "To make high-quality, personalised guidance accessible beyond one-to-one interactions.",
                accent: "#4DFFD2",
              },
              {
                text: "To build a system where the method stays human, and execution becomes continuous.",
                accent: "#7C5CFC",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm"
              >
                <div
                  className="mb-5 h-1 w-10 rounded-full"
                  style={{ background: item.accent }}
                />
                <p className="text-[#0D1525] leading-relaxed font-medium">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final tagline ────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-[#0D1525] p-1">
          <div className="rounded-[calc(1.5rem-4px)] px-10 py-20 text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#4DFFD2]">
              Malyte
            </p>
            <h2 className="font-syne text-4xl font-bold text-white md:text-5xl">
              Your method,{" "}
              <span className="text-[#7C5CFC]">without your time.</span>
            </h2>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="rounded-full bg-[#7C5CFC] px-8 py-3 font-semibold text-white transition hover:bg-[#6B4FE8]"
              >
                Start as an expert
              </Link>
              <Link
                href="/marketplace"
                className="rounded-full border border-white/20 px-8 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Browse plans
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}