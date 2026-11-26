import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/legal/LegalPage";
import { LAST_UPDATED, MIN_AGE, OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Artomango keeps about you, why, who helps us run it, and how to get it changed or deleted.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow={`Last updated ${LAST_UPDATED}`}
      title="Privacy"
      intro="We keep what it takes to run your account and get your work onto walls. No ads, no selling your data, no tracking you around the web."
    >
      <Section title="Who we are">
        <p>
          Artomango is run by <strong>{OPERATOR.name}</strong>, IČO {OPERATOR.companyId}, {OPERATOR.address}. We decide what
          happens with your data (the GDPR calls this the &ldquo;controller&rdquo;). Write to us any time at{" "}
          <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>.
        </p>
      </Section>

      <Section title="What we keep, and why">
        <ul>
          <li><strong>Your account:</strong> name, email, password (stored scrambled, we can&rsquo;t read it), your role and city. We need it to give you an account (contract, GDPR art. 6(1)(b)).</li>
          <li><strong>What you add:</strong> works, photos, prices, your public page, posts, projects, walls. Public things show to everyone; private things show only to you and the people you work with.</li>
          <li><strong>Deals and agreements:</strong> offers, messages, agreements and signatures, including the name typed to sign, the time and the email of someone signing by link. We keep these as proof of what was agreed (contract and our legal duties).</li>
          <li><strong>Sales and collectors:</strong> what you record about your sales and buyers. You are responsible for having a reason to keep your collectors&rsquo; details; we only store them for you.</li>
          <li><strong>Emails we send:</strong> which email went out and when, so we don&rsquo;t send twice and can fix delivery problems.</li>
          <li><strong>Wall label scans:</strong> which label was scanned and the hour. No IP address, device, cookie or location. A person is linked to a scan only if they choose to follow or write.</li>
          <li><strong>Reports:</strong> if you report a page, your name, email and what you wrote, so we can look into it and answer (our legal duty under the EU Digital Services Act).</li>
        </ul>
      </Section>

      <Section title="Who helps us run it">
        <p>These companies process data for us under contracts that bind them to protect it:</p>
        <ul>
          <li><strong>Supabase</strong> (database, sign-in, file storage). Your data is stored in Ireland, in the EU.</li>
          <li><strong>Vercel</strong> (hosting). Pages are served from Dublin and a worldwide network.</li>
          <li><strong>Resend</strong> (sending emails).</li>
          <li><strong>Google Maps</strong>, only when you type in an address field or open a map. Google then gets your IP address and what you type. Until you use it, nothing is loaded from Google.</li>
          <li><strong>YouTube</strong> thumbnails on a few learning links, loaded from Google when you open those pages.</li>
        </ul>
        <p>
          Some of these are US companies. Where data leaves the EU, it&rsquo;s covered by the EU&ndash;US Data Privacy Framework or
          the EU&rsquo;s standard contract clauses.
        </p>
      </Section>

      <Section title="Cookies and storage">
        <p>
          We only use what the site needs to work: a sign-in cookie that keeps you logged in, and a few small notes in your
          browser (like where to take you after you sign in). No advertising or tracking cookies, and no third-party analytics
          cookies, so there&rsquo;s no cookie banner to click.
        </p>
        <p>
          We measure how fast pages load with Vercel Speed Insights. It uses no cookies and doesn&rsquo;t identify you.
          Fonts are served from our own domain, not from Google.
        </p>
      </Section>

      <Section title="How long we keep it">
        <ul>
          <li>Your account and what you add: until you delete them or ask us to.</li>
          <li>Signed agreements: as long as the law requires us to be able to prove them, usually up to 10 years after they end.</li>
          <li>Email records: up to a year. Reports: up to 3 years after we decide.</li>
        </ul>
      </Section>

      <Section title="Your rights">
        <p>
          You can ask to see your data, get a copy, correct it, delete it, limit what we do with it or object to it. Write to{" "}
          <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a> and we&rsquo;ll answer within a month. You can switch emails off in
          your profile or from the link in any email.
        </p>
        <p>
          If you think we got something wrong, you can complain to the Czech data protection office, the{" "}
          <a href="https://uoou.gov.cz" target="_blank" rel="noreferrer">Úřad pro ochranu osobních údajů</a>, or the one where you live.
        </p>
      </Section>

      <Section title="Age">
        <p>Artomango is for people aged {MIN_AGE} or older, because you make agreements and sell here. We don&rsquo;t knowingly keep data about children. If you think a child signed up, tell us and we&rsquo;ll delete the account.</p>
      </Section>

      <Section title="Changes">
        <p>If we change this in a way that matters, we&rsquo;ll tell you by email or in the app before it applies. See also our <Link href="/terms">terms</Link>.</p>
      </Section>
    </LegalPage>
  );
}
