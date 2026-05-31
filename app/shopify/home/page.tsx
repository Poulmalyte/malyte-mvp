import Link from 'next/link'

export default function ShopifyHomePage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .home-root {
          min-height: 100vh;
          background: #0D1117;
          color: #E8EDF8;
          font-family: 'DM Sans', sans-serif;
          overflow-x: hidden;
        }

        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 48px;
          background: rgba(13, 17, 23, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .nav-logo {
          font-family: 'DM Serif Display', serif;
          font-size: 22px; color: #fff; text-decoration: none;
        }
        .nav-logo span { color: #7C5CFC; }
        .nav-cta { display: flex; gap: 12px; align-items: center; }
        .btn-ghost {
          padding: 9px 20px; border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.15);
          color: #94A3B8; font-size: 13px; font-weight: 500;
          text-decoration: none; transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-ghost:hover { border-color: rgba(255,255,255,0.3); color: #fff; }
        .btn-primary {
          padding: 9px 22px; border-radius: 100px;
          background: #7C5CFC; color: #fff;
          font-size: 13px; font-weight: 600;
          text-decoration: none; transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-primary:hover { background: #6d4ef0; }

        .hero {
          padding: 160px 48px 100px;
          max-width: 1100px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 80px; align-items: center;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 14px; border-radius: 100px;
          border: 1px solid rgba(124,92,252,0.3);
          background: rgba(124,92,252,0.08);
          font-size: 12px; font-weight: 600; color: #A78BFA;
          letter-spacing: 0.5px; margin-bottom: 28px;
        }
        .hero-badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #7C5CFC; animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
        }
        .hero-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(40px, 4.5vw, 62px);
          line-height: 1.08; color: #fff;
          letter-spacing: -1px; margin-bottom: 24px;
        }
        .hero-title em { font-style: italic; color: #A78BFA; }
        .hero-sub {
          font-size: 17px; line-height: 1.75;
          color: #64748B; font-weight: 300;
          margin-bottom: 40px; max-width: 440px;
        }
        .hero-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .btn-large {
          padding: 14px 32px; border-radius: 100px;
          background: #7C5CFC; color: #fff;
          font-size: 15px; font-weight: 600;
          text-decoration: none; transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-large:hover { background: #6d4ef0; transform: translateY(-1px); }
        .btn-outline-large {
          padding: 14px 28px; border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.15);
          color: #94A3B8; font-size: 15px; font-weight: 500;
          text-decoration: none; transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-outline-large:hover { border-color: rgba(255,255,255,0.3); color: #fff; }

        .hero-visual { position: relative; }
        .mockup-card {
          background: #161B27;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; padding: 28px;
          position: relative; overflow: hidden;
        }
        .mockup-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(124,92,252,0.5), transparent);
        }
        .mockup-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .mockup-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #7C5CFC, #4DFFD2);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #fff;
        }
        .mockup-name { font-size: 13px; font-weight: 600; color: #E8EDF8; }
        .mockup-role { font-size: 11px; color: #64748B; }
        .mockup-plan {
          background: rgba(124,92,252,0.08);
          border: 1px solid rgba(124,92,252,0.15);
          border-radius: 12px; padding: 16px; margin-bottom: 12px;
        }
        .mockup-plan-title { font-size: 12px; font-weight: 600; color: #A78BFA; margin-bottom: 8px; }
        .mockup-plan-row {
          display: flex; justify-content: space-between;
          font-size: 11px; color: #64748B; margin-bottom: 4px;
        }
        .mockup-plan-row span:last-child { color: #E8EDF8; font-weight: 500; }
        .mockup-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
        .mockup-stat {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; padding: 12px;
        }
        .mockup-stat-val { font-size: 20px; font-weight: 700; color: #fff; font-family: 'DM Serif Display', serif; }
        .mockup-stat-label { font-size: 10px; color: #64748B; margin-top: 2px; }
        .mockup-badge {
          position: absolute; top: -12px; right: 20px;
          background: #059669; color: #fff;
          font-size: 10px; font-weight: 700; padding: 4px 10px;
          border-radius: 100px; letter-spacing: 0.5px;
        }

        .categories { padding: 0 48px 80px; max-width: 1100px; margin: 0 auto; }
        .categories-label {
          font-size: 11px; font-weight: 600; color: #64748B;
          letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 20px;
        }
        .categories-pills { display: flex; flex-wrap: wrap; gap: 10px; }
        .pill {
          padding: 8px 18px; border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          font-size: 13px; color: #94A3B8;
        }

        .section {
          padding: 80px 48px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .section-inner { max-width: 1100px; margin: 0 auto; }
        .section-tag {
          font-size: 11px; font-weight: 600; color: #7C5CFC;
          letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 16px;
        }
        .section-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(28px, 3vw, 44px);
          color: #fff; line-height: 1.15; margin-bottom: 16px;
        }
        .section-sub {
          font-size: 16px; color: #64748B;
          line-height: 1.7; max-width: 500px;
          margin-bottom: 60px; font-weight: 300;
        }
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
        .step {
          background: #161B27;
          border: 1px solid rgba(255,255,255,0.06);
          padding: 36px 32px; position: relative;
        }
        .step:first-child { border-radius: 16px 0 0 16px; }
        .step:last-child { border-radius: 0 16px 16px 0; }
        .step-num { font-size: 11px; font-weight: 600; color: #7C5CFC; letter-spacing: 1px; margin-bottom: 20px; }
        .step-icon { font-size: 28px; margin-bottom: 16px; }
        .step-title { font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 10px; }
        .step-desc { font-size: 13px; color: #64748B; line-height: 1.65; }

        .features { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; margin-top: 60px; }
        .feature {
          background: #161B27;
          border: 1px solid rgba(255,255,255,0.06);
          padding: 32px;
        }
        .feature:nth-child(1) { border-radius: 16px 0 0 0; }
        .feature:nth-child(2) { border-radius: 0 16px 0 0; }
        .feature:nth-child(3) { border-radius: 0 0 0 16px; }
        .feature:nth-child(4) { border-radius: 0 0 16px 0; }
        .feature-icon { font-size: 24px; margin-bottom: 16px; }
        .feature-title { font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 8px; }
        .feature-desc { font-size: 13px; color: #64748B; line-height: 1.65; }

        .cta-section { padding: 100px 48px; border-top: 1px solid rgba(255,255,255,0.06); }
        .cta-inner { max-width: 640px; margin: 0 auto; text-align: center; }
        .cta-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(32px, 3.5vw, 52px);
          color: #fff; line-height: 1.1; margin-bottom: 20px;
        }
        .cta-title em { font-style: italic; color: #A78BFA; }
        .cta-sub { font-size: 16px; color: #64748B; line-height: 1.7; margin-bottom: 40px; font-weight: 300; }

        .footer {
          padding: 32px 48px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex; justify-content: space-between; align-items: center;
        }
        .footer-logo { font-family: 'DM Serif Display', serif; font-size: 18px; color: #fff; text-decoration: none; }
        .footer-logo span { color: #7C5CFC; }
        .footer-text { font-size: 12px; color: #64748B; }

        .glow {
          position: fixed; top: -200px; left: 50%;
          transform: translateX(-50%);
          width: 600px; height: 400px;
          background: radial-gradient(ellipse, rgba(124,92,252,0.12) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }

        @media (max-width: 768px) {
          .nav { padding: 16px 20px; }
          .hero { grid-template-columns: 1fr; padding: 120px 20px 60px; gap: 48px; }
          .hero-visual { display: none; }
          .categories { padding: 0 20px 60px; }
          .section { padding: 60px 20px; }
          .steps { grid-template-columns: 1fr; gap: 2px; }
          .step:first-child { border-radius: 16px 16px 0 0; }
          .step:last-child { border-radius: 0 0 16px 16px; }
          .features { grid-template-columns: 1fr; }
          .feature:nth-child(1) { border-radius: 16px 16px 0 0; }
          .feature:nth-child(4) { border-radius: 0 0 16px 16px; }
          .feature:nth-child(2), .feature:nth-child(3) { border-radius: 0; }
          .cta-section { padding: 60px 20px; }
          .footer { padding: 24px 20px; flex-direction: column; gap: 12px; text-align: center; }
        }
      `}</style>

      <div className="home-root">
        <div className="glow" />

        <nav className="nav">
          <Link href="/shopify/home" className="nav-logo">malyte<span>.</span></Link>
          <div className="nav-cta">
            <Link href="/shopify" className="btn-ghost">Sign in</Link>
            <Link href="/shopify" className="btn-primary">Get started →</Link>
          </div>
        </nav>

        <section className="hero">
          <div>
            <div className="hero-badge">
              <div className="hero-badge-dot" />
              Built for wellness professionals
            </div>
            <h1 className="hero-title">
              Your method.<br />
              <em>Scaled by AI.</em><br />
              Sold on Shopify.
            </h1>
            <p className="hero-sub">
              Upload your methodology once. Malyte generates fully personalized plans for every client — automatically, at scale, in your voice.
            </p>
            <div className="hero-actions">
              <Link href="/shopify" className="btn-large">Start for free →</Link>
              <Link href="/plan/demo-token-shopify-review-001" className="btn-outline-large" target="_blank">See a sample plan</Link>
            </div>
          </div>

          <div className="hero-visual">
            <div className="mockup-card">
              <div className="mockup-badge">✓ Plan generated</div>
              <div className="mockup-header">
                <div className="mockup-avatar">SJ</div>
                <div>
                  <div className="mockup-name">Sarah Johnson</div>
                  <div className="mockup-role">8-Week Weight Loss Program</div>
                </div>
              </div>
              <div className="mockup-plan">
                <div className="mockup-plan-title">📋 Week 1 — Personalized Plan</div>
                <div className="mockup-plan-row"><span>Calories target</span><span>1,500 kcal/day</span></div>
                <div className="mockup-plan-row"><span>Workout days</span><span>4x per week</span></div>
                <div className="mockup-plan-row"><span>Focus</span><span>Fat loss + habits</span></div>
                <div className="mockup-plan-row"><span>Next check-in</span><span>Day 7</span></div>
              </div>
              <div className="mockup-stats">
                <div className="mockup-stat">
                  <div className="mockup-stat-val">12</div>
                  <div className="mockup-stat-label">Active clients</div>
                </div>
                <div className="mockup-stat">
                  <div className="mockup-stat-val">48</div>
                  <div className="mockup-stat-label">Plans generated</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="categories">
          <div className="categories-label">Works for every discipline</div>
          <div className="categories-pills">
            {['🥗 Nutrition', '💪 Personal Training', '🧠 Mental Coaching', '🧘 Yoga & Mindfulness', '💆 Skincare & Wellness', '🏃 Running & Endurance', '🍽️ Meal Planning', '💤 Sleep Coaching'].map(c => (
              <div key={c} className="pill">{c}</div>
            ))}
          </div>
        </div>

        <section className="section">
          <div className="section-inner">
            <div className="section-tag">How it works</div>
            <h2 className="section-title">From your expertise<br />to a scalable product</h2>
            <p className="section-sub">Three steps to turn your methodology into an AI-powered service your clients will love.</p>
            <div className="steps">
              <div className="step">
                <div className="step-num">01</div>
                <div className="step-icon">📄</div>
                <div className="step-title">Upload your methodology</div>
                <div className="step-desc">Upload your existing plans, protocols and frameworks as PDFs. Malyte reads and understands your unique approach.</div>
              </div>
              <div className="step">
                <div className="step-num">02</div>
                <div className="step-icon">🤖</div>
                <div className="step-title">AI learns your method</div>
                <div className="step-desc">Our AI goes through a structured interview to capture the logic behind your method — your rules, your priorities, your voice.</div>
              </div>
              <div className="step">
                <div className="step-num">03</div>
                <div className="step-icon">✨</div>
                <div className="step-title">Clients get personalized plans</div>
                <div className="step-desc">Every buyer answers a few questions. The AI generates a fully personalized plan based on your methodology — instantly.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-inner">
            <div className="section-tag">Features</div>
            <h2 className="section-title">Everything you need<br />to scale your practice</h2>
            <p className="section-sub">Built specifically for health and wellness professionals who want to grow without losing quality.</p>
            <div className="features">
              <div className="feature">
                <div className="feature-icon">🔄</div>
                <div className="feature-title">Weekly adaptive plans</div>
                <div className="feature-desc">Plans evolve week by week based on client check-ins. The AI adapts nutrition, training and focus areas to their actual progress.</div>
              </div>
              <div className="feature">
                <div className="feature-icon">🎯</div>
                <div className="feature-title">Your methodology, not generic AI</div>
                <div className="feature-desc">Malyte doesn't generate generic plans. It replicates your specific approach — your rules, your language, your results.</div>
              </div>
              <div className="feature">
                <div className="feature-icon">🛍️</div>
                <div className="feature-title">Sell directly on Shopify</div>
                <div className="feature-desc">Connect your Shopify store in minutes. Your clients buy, answer questions, and receive their personalized plan automatically.</div>
              </div>
              <div className="feature">
                <div className="feature-icon">📊</div>
                <div className="feature-title">Track client progress</div>
                <div className="feature-desc">See all your clients in one dashboard. Track plan generation, check-in completion and engagement — all in real time.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-inner">
            <h2 className="cta-title">Ready to scale<br /><em>your expertise?</em></h2>
            <p className="cta-sub">Join professionals who are already using Malyte to deliver personalized plans at scale — without spending more time.</p>
            <Link href="/shopify" className="btn-large">Get started for free →</Link>
          </div>
        </section>

        <footer className="footer">
          <Link href="/shopify/home" className="footer-logo">malyte<span>.</span></Link>
          <span className="footer-text">© 2026 Malyte · AI-powered wellness programs</span>
        </footer>
      </div>
    </>
  )
}