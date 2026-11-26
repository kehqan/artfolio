import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/legal/LegalPage";
import { LAST_UPDATED, MIN_AGE, OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms",
  description: "The rules for using Artomango, in plain words.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow={`Last updated ${LAST_UPDATED}`}
      title="Terms"
      intro="The rules for using Artomango, in plain words. By creating an account you agree to them."
    >
      <Section title="Who you're dealing with">
        <p>
          Artomango is run by <strong>{OPERATOR.name}</strong>, IČO {OPERATOR.companyId}, {OPERATOR.address},{" "}
          <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>. These terms follow Czech law.
        </p>
      </Section>

      <Section title="Your account">
        <ul>
          <li>You must be {MIN_AGE} or older.</li>
          <li>Tell the truth about who you are and, if you sign up a venue, that you can act for it.</li>
          <li>Keep your password to yourself. What happens in your account is on you, unless someone broke in and you told us quickly.</li>
          <li>Artomango is free for now. If we ever add paid plans, we&rsquo;ll show the price, how often it renews and how to cancel right next to the button, before you pay anything.</li>
        </ul>
      </Section>

      <Section title="Your work stays yours">
        <p>
          You keep every right to the art, photos and words you add. You give us a free, non-exclusive permission to store
          them, show them on Artomango and on your public page, make small versions and labels of them, and show them in
          emails and previews, only to run the service. It ends when you delete them, except copies already in agreements
          others signed.
        </p>
        <p>Only add work you made or have the right to show. Don&rsquo;t add anything illegal, hateful, or someone else&rsquo;s private details.</p>
      </Section>

      <Section title="Deals, agreements and sales">
        <p>
          Artomango helps artists, venues and curators find each other and put their deal in writing. The agreement is between
          you and them; we are not a party to it, and we don&rsquo;t check that people keep their word. A typed-name signature here
          is meant to bind you, so read before you sign.
        </p>
        <p>
          When a work has a Buy button, it goes to the link the artist chose. The sale happens there, between the artist and the
          buyer. We take no commission for now.
        </p>
      </Section>

      <Section title="When something's wrong">
        <p>
          If something on Artomango copies your work, breaks the law or shares private details, <Link href="/report">report it</Link>.
          A person looks at every report. We may hide or remove content or close accounts that break these rules, and we&rsquo;ll
          tell the person why and how to appeal, unless the law says we can&rsquo;t.
        </p>
      </Section>

      <Section title="Our part">
        <p>
          We work hard to keep Artomango running and your data safe, but we can&rsquo;t promise it will never be down or have bugs.
          As far as the law allows, we aren&rsquo;t liable for indirect losses or for what other people do. Nothing here limits
          your rights as a consumer under EU or Czech law.
        </p>
      </Section>

      <Section title="Leaving, and changes">
        <p>
          You can stop any time and ask us to delete your account. We can close an account that badly or repeatedly breaks these
          rules. If we change these terms in a way that matters, we&rsquo;ll tell you at least 30 days before. How we handle your data
          is in our <Link href="/privacy">privacy policy</Link>.
        </p>
        <p>
          Disagreements go to Czech courts. Consumers can also use the Czech Trade Inspection Authority&rsquo;s out-of-court
          resolution (<a href="https://adr.coi.cz" target="_blank" rel="noreferrer">adr.coi.cz</a>).
        </p>
      </Section>
    </LegalPage>
  );
}
