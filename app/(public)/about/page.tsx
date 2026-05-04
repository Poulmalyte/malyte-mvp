import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata = {
  title: "About Us | Malyte",
  description:
    "We don't replace experts. We elevate their method. Malyte transforms professional methodology into a scalable, personalised system powered by AI.",
};

export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F7FA", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Navbar ── */}
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E8EDF8", padding: "0 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 20, color: "#0F172A" }}>
              malyte<span style={{ color: "#7C5CFC" }}>.</span>
            </span>
          </Link>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/login" style={{ textDecoration: "none", fontSize: 13, fontWeight: 500, color: "#64748B" }}>Log in</Link>
            <Link href="/signup" style={{ textDecoration: "none", fontSize: 13, fontWeight: 700, color: "#fff", background: "#7C5CFC", padding: "8px 18px", borderRadius: 100 }}>Sign up free</Link>
          </div>
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ position: "relative", overflow: "hidden", padding: "80px 24px 72px", borderBottom: "1px solid #E8EDF8" }}>
        <div style={{ position: "absolute", top: -120, left: -120, width: 500, height: 500, borderRadius: "50%", background: "#7C5CFC", opacity: 0.07, filter: "blur(120px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 40, right: 0, width: 400, height: 400, borderRadius: "50%", background: "#4DFFD2", opacity: 0.07, filter: "blur(100px)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7C5CFC", marginBottom: 20 }}>
            About Us
          </p>
          <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: "clamp(32px, 5vw, 54px)", lineHeight: 1.15, color: "#0F172A", marginBottom: 28 }}>
            We don't replace experts.{" "}
            <span style={{ color: "#7C5CFC" }}>We elevate their method.</span>
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.75, color: "#4A5568", marginBottom: 16, maxWidth: 620 }}>
            In a time where artificial intelligence is reshaping entire industries, we believe something essential must remain untouched: human expertise.
          </p>
          <p style={{ fontSize: 17, lineHeight: 1.75, color: "#4A5568", maxWidth: 620 }}>
            At Malyte, the method of a professional is not something to be replaced. It is the result of experience, intuition, real-world application and continuous refinement. It cannot be replicated by artificial intelligence.{" "}
            <strong style={{ color: "#0F172A" }}>It can only be extended.</strong>
          </p>
        </div>
      </div>

      {/* ── Sections ── */}
      {[
        {
          n: "01",
          title: "The limitation of time",
          bg: "#F5F7FA",
          content: (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 16, lineHeight: 1.75, color: "#4A5568" }}>
              <p>Today, professionals in wellness operate within a fundamental constraint. Their growth is directly tied to their availability.</p>
              <p style={{ borderLeft: "3px solid #7C5CFC", paddingLeft: 20, color: "#0F172A", fontWeight: 500 }}>
                Each client requires attention. Each result requires presence.<br />And while demand increases, time does not.
              </p>
              <p>This creates a ceiling that even the most skilled professionals cannot surpass.</p>
              <p>At the same time, most digital solutions attempt to solve this by simplifying, standardizing, or removing the human element entirely. The result is often impersonal, static and disconnected from real expertise.</p>
            </div>
          ),
        },
        {
          n: "02",
          title: "A different approach",
          bg: "#FFFFFF",
          content: (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 16, lineHeight: 1.75, color: "#4A5568" }}>
              <p>Malyte is built on a different premise.</p>
              <div style={{ background: "#F5F7FA", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ color: "#0F172A", fontWeight: 600, margin: 0 }}>Technology should not replace the professional.</p>
                <p style={{ color: "#0F172A", fontWeight: 600, margin: 0 }}>It should execute their method with precision, consistency and scale.</p>
              </div>
              <p>We transform a professional's method into a structured system capable of delivering personalised experiences to every individual, while remaining fully aligned with the original logic and philosophy behind it.</p>
              <p>The role of artificial intelligence is not to decide instead of the expert, but to carry out what the expert has already defined.</p>
            </div>
          ),
        },
        {
          n: "03",
          title: "Method as the core",
          bg: "#F5F7FA",
          content: (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 16, lineHeight: 1.75, color: "#4A5568" }}>
              <p>Everything starts from the method.</p>
              <p style={{ borderLeft: "3px solid #4DFFD2", paddingLeft: 20, color: "#0F172A", fontWeight: 500 }}>
                The sequences, the rules, the adjustments, the reasoning.<br />
                What normally happens in a one-to-one interaction is translated into a system that preserves its integrity.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                {[
                  { label: "Each person", desc: "receives a personalised output" },
                  { label: "Each plan", desc: "evolves over time" },
                  { label: "Each result", desc: "remains grounded in the professional's approach" },
                ].map((item) => (
                  <div key={item.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 18px" }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: "#0F172A", margin: "0 0 4px" }}>{item.label}</p>
                    <p style={{ fontSize: 12, color: "#718096", margin: 0 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontWeight: 600, color: "#0F172A" }}>Nothing is generic. Nothing is detached.</p>
            </div>
          ),
        },
        {
          n: "04",
          title: "Human-centered by design",
          bg: "#FFFFFF",
          content: (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 16, lineHeight: 1.75, color: "#4A5568" }}>
              <p>We believe that technology should adapt to people, not the opposite.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "The professional remains at the center.",
                  "Their method remains the source of truth.",
                  "Their expertise remains the differentiating factor.",
                ].map((line) => (
                  <div key={line} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ marginTop: 7, width: 8, height: 8, borderRadius: "50%", background: "#7C5CFC", flexShrink: 0 }} />
                    <p style={{ color: "#0F172A", fontWeight: 500, margin: 0 }}>{line}</p>
                  </div>
                ))}
              </div>
              <p>Malyte simply removes the limitations of time, allowing that expertise to reach more people without dilution.</p>
            </div>
          ),
        },
      ].map((section) => (
        <div key={section.n} style={{ background: section.bg, borderBottom: "1px solid #E8EDF8", padding: "64px 24px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "200px 1fr", gap: 48, alignItems: "start" }}>
            <div>
              <span style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#CBD5E1" }}>{section.n}</span>
              <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22, color: "#0F172A", marginTop: 8, lineHeight: 1.3 }}>{section.title}</h2>
            </div>
            <div>{section.content}</div>
          </div>
        </div>
      ))}

      {/* ── Mission ── */}
      <div style={{ background: "#F5F7FA", borderBottom: "1px solid #E8EDF8", padding: "72px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#CBD5E1" }}>05</span>
            <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 32, color: "#0F172A", marginTop: 8 }}>Our mission</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              { text: "To enable professionals to scale their impact without compromising their identity.", accent: "#7C5CFC" },
              { text: "To make high-quality, personalised guidance accessible beyond one-to-one interactions.", accent: "#4DFFD2" },
              { text: "To build a system where the method stays human, and execution becomes continuous.", accent: "#7C5CFC" },
            ].map((item, i) => (
              <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 18, padding: "28px 28px 28px" }}>
                <div style={{ width: 36, height: 4, borderRadius: 100, background: item.accent, marginBottom: 20 }} />
                <p style={{ fontSize: 15, lineHeight: 1.7, color: "#0F172A", fontWeight: 500, margin: 0 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tagline ── */}
      <div style={{ padding: "64px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", background: "#0D1525", borderRadius: 24, padding: "72px 40px", textAlign: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#4DFFD2", marginBottom: 16 }}>Malyte</p>
          <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: "clamp(28px, 4vw, 46px)", color: "#FFFFFF", lineHeight: 1.2, marginBottom: 36 }}>
            Your method,{" "}
            <span style={{ color: "#7C5CFC" }}>without your time.</span>
          </h2>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" style={{ textDecoration: "none", background: "#7C5CFC", color: "#fff", fontWeight: 700, fontSize: 14, padding: "12px 28px", borderRadius: 100 }}>
              Start as an expert
            </Link>
            <Link href="/marketplace" style={{ textDecoration: "none", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontWeight: 600, fontSize: 14, padding: "12px 28px", borderRadius: 100 }}>
              Browse plans
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}