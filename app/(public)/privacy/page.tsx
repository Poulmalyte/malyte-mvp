export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', color: '#1A1A2E', fontFamily: "'Outfit', sans-serif", fontSize: 16, lineHeight: 1.8 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
        .legal-container { max-width: 800px; margin: 0 auto; padding: 80px 40px; }
        .legal-logo { font-weight: 800; font-size: 22px; color: #1A1A2E; margin-bottom: 60px; display: block; text-decoration: none; }
        .legal-logo span { color: #7C5CFC; }
        h1 { font-size: 36px; font-weight: 800; letter-spacing: -1px; color: #1A1A2E; margin-bottom: 8px; }
        .meta { font-size: 13px; color: #8888AA; margin-bottom: 48px; }
        h2 { font-size: 20px; font-weight: 700; color: #1A1A2E; margin-top: 48px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.08); }
        h3 { font-size: 16px; font-weight: 600; color: #1A1A2E; margin-top: 24px; margin-bottom: 10px; }
        p { color: #4A4A6A; margin-bottom: 16px; }
        ul { color: #4A4A6A; padding-left: 24px; margin-bottom: 16px; }
        ul li { margin-bottom: 8px; }
        .highlight { background: rgba(124,92,252,0.06); border-left: 3px solid #7C5CFC; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0; }
        .highlight p { margin: 0; color: #1A1A2E; }
        .table-wrap { overflow-x: auto; margin: 24px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th { background: rgba(124,92,252,0.08); color: #1A1A2E; font-weight: 600; text-align: left; padding: 12px 16px; border: 1px solid rgba(0,0,0,0.08); }
        td { padding: 12px 16px; border: 1px solid rgba(0,0,0,0.08); color: #4A4A6A; vertical-align: top; }
        a { color: #7C5CFC; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .footer-doc { display: block; margin-top: 80px; padding-top: 32px; border-top: 1px solid rgba(0,0,0,0.08); font-size: 13px; color: #8888AA; }
        @media(max-width: 768px) { .legal-container { padding: 40px 20px; } h1 { font-size: 28px; } }
      `}</style>
      <div className="legal-container">
        <a className="legal-logo" href="/">malyte<span>.</span></a>
        <h1>Privacy Policy</h1>
        <div className="meta">Last updated: May 2025 · Compliant with EU GDPR (Regulation 2016/679)</div>
        <div className="highlight"><p><strong>Your privacy matters.</strong> This Privacy Policy explains how Malyte collects, uses, stores, and protects your personal data — including sensitive health-related information — in compliance with the EU General Data Protection Regulation (GDPR). By registering or using the Platform, you explicitly consent to the processing described in this Policy.</p></div>
        <h2>1. Data Controller</h2>
        <p>The data controller responsible for your personal data is:</p>
        <p><strong>Malyte</strong><br />Italy<br />Email: <a href="mailto:hello@malyte.com">hello@malyte.com</a></p>
        <p>This Privacy Policy applies in favour of Malyte and any individual, company, or legal entity that at any time owns, manages, operates, or is responsible for the Malyte platform and its associated services, whether now or in the future.</p>
        <h2>2. Data We Collect</h2>
        <p>We collect the following categories of personal data:</p>
        <h3>2.1 Account Data</h3>
        <ul>
          <li>First and last name</li>
          <li>Email address</li>
          <li>Password (stored in encrypted form)</li>
          <li>Account type (Buyer or Seller)</li>
          <li>Registration date and time</li>
        </ul>
        <h3>2.2 Profile Data (Sellers)</h3>
        <ul>
          <li>Professional bio and credentials</li>
          <li>Profile photo</li>
          <li>Specialisation and category</li>
          <li>Uploaded methodology and content</li>
          <li>Payment and billing information (processed via Shopify Billing)</li>
        </ul>
        <h3>2.3 Personal and Health-Related Data (Buyers)</h3>
        <p>In order to generate personalised wellness plans, we collect the following information from Buyers. This data may constitute sensitive personal data under the GDPR and is processed only with your explicit consent:</p>
        <ul>
          <li>Full name and age</li>
          <li>Physical address</li>
          <li>Body measurements (including weight, height, and other physical metrics)</li>
          <li>Health habits, lifestyle information, and daily routines</li>
          <li>Fitness goals and activity levels</li>
          <li>Dietary preferences, restrictions, and intolerances</li>
          <li>Skincare type, conditions, and concerns</li>
          <li>Any other personal information you voluntarily provide through questionnaires</li>
        </ul>
        <div className="highlight"><p><strong>Sensitive Data Notice:</strong> Physical measurements, health habits, and related personal information are classified as sensitive personal data under Article 9 of the GDPR. By completing a Buyer questionnaire, you explicitly consent to the collection and processing of this data solely for the purpose of generating your personalised wellness plan.</p></div>
        <h3>2.4 Transaction Data</h3>
        <ul>
          <li>Purchase history and amounts</li>
          <li>Payment method details (processed and stored by Shopify — Malyte does not store full card details)</li>
          <li>Invoices and receipts</li>
        </ul>
        <h3>2.5 Usage Data</h3>
        <ul>
          <li>IP address and approximate location</li>
          <li>Browser type and version</li>
          <li>Device type and operating system</li>
          <li>Pages visited, time spent, and actions taken on the Platform</li>
          <li>Referral source</li>
        </ul>
        <h3>2.6 Cookie and Tracking Data</h3>
        <p>Malyte currently uses essential cookies only. In the future, we may deploy analytics, marketing, and third-party tracking cookies and technologies (including but not limited to Google Analytics, Meta Pixel, and similar tools). By accepting this Privacy Policy, you consent to the use of such cookies and tracking technologies, now and as they may be introduced in the future. You will be notified of any material changes via an in-platform notice or email, and will have the opportunity to update your preferences at any time through our Cookie Settings.</p>
        <h2>3. How We Use Your Data</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Purpose</th><th>Legal Basis (GDPR)</th></tr>
            </thead>
            <tbody>
              <tr><td>Creating and managing your account</td><td>Performance of a contract (Art. 6(1)(b))</td></tr>
              <tr><td>Generating personalised wellness plans</td><td>Explicit consent (Art. 6(1)(a) and Art. 9(2)(a))</td></tr>
              <tr><td>Processing payments and managing transactions</td><td>Performance of a contract (Art. 6(1)(b))</td></tr>
              <tr><td>Communicating with you about your account or purchases</td><td>Performance of a contract (Art. 6(1)(b))</td></tr>
              <tr><td>Sending platform updates, product news, and marketing</td><td>Consent (Art. 6(1)(a)) — you may opt out at any time</td></tr>
              <tr><td>Improving the Platform and AI models</td><td>Legitimate interests (Art. 6(1)(f))</td></tr>
              <tr><td>Complying with legal obligations</td><td>Legal obligation (Art. 6(1)(c))</td></tr>
              <tr><td>Analytics and usage tracking (current and future)</td><td>Consent (Art. 6(1)(a))</td></tr>
              <tr><td>Fraud prevention and platform security</td><td>Legitimate interests (Art. 6(1)(f))</td></tr>
            </tbody>
          </table>
        </div>
        <h2>4. Data Sharing and Third Parties</h2>
        <p>We do not sell your personal data. We may share your data with the following categories of third parties, strictly as necessary to operate the Platform:</p>
        <ul>
          <li><strong>Shopify</strong> — billing and payment processing via the Shopify Billing API, and access to store data (products, orders, customers) required to provide the service. Subject to Shopify&apos;s own privacy policy and PCI-DSS compliance.</li>
          <li><strong>Supabase</strong> — database and infrastructure hosting. Data stored within secure, GDPR-compliant cloud infrastructure.</li>
          <li><strong>Anthropic (Claude API)</strong> — AI plan generation. Questionnaire data is processed to generate wellness plans. Data is not used to train Anthropic&apos;s models without consent.</li>
          <li><strong>Vercel</strong> — platform hosting and deployment.</li>
          <li><strong>Analytics and marketing providers</strong> — as introduced in the future, including Google Analytics, Meta, and similar platforms, subject to your cookie consent.</li>
          <li><strong>Legal and regulatory authorities</strong> — where required by applicable law.</li>
        </ul>
        <p>All third-party processors are bound by data processing agreements and are required to handle your data in compliance with applicable privacy laws.</p>
        <h2>5. International Data Transfers</h2>
        <p>Some of our third-party service providers may process data outside the European Economic Area (EEA). Where such transfers occur, we ensure appropriate safeguards are in place, including Standard Contractual Clauses approved by the European Commission, or equivalent measures as permitted under the GDPR.</p>
        <h2>6. Data Retention</h2>
        <p>We retain your personal data for as long as necessary to fulfil the purposes described in this Policy, or as required by applicable law:</p>
        <ul>
          <li><strong>Account data:</strong> Retained for the duration of your account plus 2 years after deletion, unless a longer period is required by law.</li>
          <li><strong>Health and questionnaire data:</strong> Retained for the duration of your account. Upon account deletion, this data is permanently deleted within 30 days.</li>
          <li><strong>Transaction data:</strong> Retained for 10 years in accordance with Italian tax and accounting regulations.</li>
          <li><strong>Usage and analytics data:</strong> Retained for up to 26 months.</li>
        </ul>
        <h2>7. Your Rights Under GDPR</h2>
        <p>As a data subject under the GDPR, you have the following rights:</p>
        <ul>
          <li><strong>Right of access</strong> — you may request a copy of all personal data we hold about you.</li>
          <li><strong>Right to rectification</strong> — you may request correction of inaccurate or incomplete data.</li>
          <li><strong>Right to erasure</strong> (&quot;right to be forgotten&quot;) — you may request deletion of your personal data, subject to legal retention obligations.</li>
          <li><strong>Right to restriction</strong> — you may request that we limit the processing of your data in certain circumstances.</li>
          <li><strong>Right to data portability</strong> — you may request your data in a structured, machine-readable format.</li>
          <li><strong>Right to object</strong> — you may object to processing based on legitimate interests or for direct marketing purposes.</li>
          <li><strong>Right to withdraw consent</strong> — where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of prior processing.</li>
          <li><strong>Right to lodge a complaint</strong> — you have the right to lodge a complaint with your national data protection authority. In Italy, this is the Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank">www.garanteprivacy.it</a>).</li>
        </ul>
        <p>To exercise any of these rights, please contact us at <a href="mailto:hello@malyte.com">hello@malyte.com</a>. We will respond within 30 days.</p>
        <h2>8. Data Security</h2>
        <p>We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, loss, alteration, or disclosure. These include:</p>
        <ul>
          <li>Encryption of data in transit (TLS/HTTPS) and at rest</li>
          <li>Secure authentication and access controls</li>
          <li>Regular security assessments</li>
          <li>Limited access to personal data on a need-to-know basis</li>
        </ul>
        <p>Despite these measures, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security and accept no liability for unauthorised access beyond our reasonable control.</p>
        <h2>9. Children&apos;s Privacy</h2>
        <p>Malyte is not intended for use by individuals under the age of 18. We do not knowingly collect personal data from minors. If we become aware that we have inadvertently collected data from a minor, we will delete it promptly. If you believe a minor has registered on our Platform, please contact us at <a href="mailto:hello@malyte.com">hello@malyte.com</a>.</p>
        <h2>10. Cookies</h2>
        <p>We currently use only essential cookies necessary for the Platform to function. In the future, we intend to introduce additional cookies including:</p>
        <ul>
          <li><strong>Analytics cookies</strong> — to understand how users interact with the Platform (e.g. Google Analytics)</li>
          <li><strong>Marketing and retargeting cookies</strong> — to deliver relevant advertising (e.g. Meta Pixel, Google Ads)</li>
          <li><strong>Preference cookies</strong> — to remember your settings and preferences</li>
        </ul>
        <p>By accepting this Privacy Policy at registration, you provide advance consent to the use of these cookie categories as they are introduced. You will always have the ability to manage your cookie preferences through our Cookie Settings panel, which will be made available when additional cookies are deployed.</p>
        <h2>11. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. Where changes are material, we will notify you by email or through a prominent notice on the Platform. Your continued use of the Platform following notification constitutes your acceptance of the updated Policy.</p>
        <h2>12. Contact Us</h2>
        <p>For any questions, concerns, or requests relating to this Privacy Policy or the processing of your personal data, please contact:</p>
        <p><strong>Malyte — Data Protection Contact</strong><br />Italy<br /><a href="mailto:hello@malyte.com">hello@malyte.com</a></p>
        <span className="footer-doc">© 2025 Malyte · Privacy Policy · <a href="/terms">Terms & Conditions</a></span>
      </div>
    </div>
  )
}