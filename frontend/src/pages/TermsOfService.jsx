import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const EFFECTIVE_DATE = 'August 8, 2026';

export default function TermsOfService() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Terms of Service | My Skool Club';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3 font-bold text-blue-700">
            <img src="/msc.png" alt="" className="h-11 w-11 object-contain" />
            <span className="text-lg sm:text-xl">My Skool Club</span>
          </Link>
          <Link
            to="/login"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">
            My Skool Club
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Effective and last updated: {EFFECTIVE_DATE}
          </p>

          <div className="mt-8 space-y-9 text-[15px] leading-7 text-slate-700 sm:text-base">
            <TermsSection title="1. Agreement to these terms">
              <p>
                These Terms of Service govern your use of the My Skool Club website,
                mobile application, and related services (collectively, the “Service”).
                By creating an account or using the Service, you agree to these terms and
                our <Link to="/privacy" className="font-semibold text-blue-700 underline">Privacy Policy</Link>.
                If you do not agree, do not use the Service.
              </p>
            </TermsSection>

            <TermsSection title="2. Eligibility and organizational authorization">
              <p>
                You must be at least 13 years old and legally able to agree to these terms.
                If you use the Service for a school, club, or other organization, you
                represent that you are authorized to act for that organization. An
                organization allowing minors to participate is responsible for obtaining
                any consent or authorization required by law.
              </p>
            </TermsSection>

            <TermsSection title="3. Accounts and security">
              <p>
                You must provide accurate account information, protect your password, and
                promptly notify us if you believe your account has been compromised. You
                are responsible for activity performed through your account. You may not
                impersonate another person, share an account to bypass permissions, or
                create an account for someone without authorization.
              </p>
            </TermsSection>

            <TermsSection title="4. School and club roles">
              <p>
                Access to schools, clubs, administrative tools, invoices, inventory, and
                other records depends on membership status and assigned roles. Authorized
                administrators are responsible for granting and reviewing access
                appropriately. We may correct or remove access that is unauthorized,
                unsafe, or inconsistent with these terms.
              </p>
            </TermsSection>

            <TermsSection title="5. Acceptable use">
              <p>You may not use the Service to:</p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>Break the law, violate another person’s rights, or facilitate harm.</li>
                <li>Harass, threaten, discriminate against, or exploit another person.</li>
                <li>Upload malicious code or interfere with the Service or its security.</li>
                <li>Access data, accounts, schools, or clubs without authorization.</li>
                <li>Scrape, reverse engineer, overload, or misuse the Service.</li>
                <li>Submit false, fraudulent, or misleading financial or organizational records.</li>
              </ul>
            </TermsSection>

            <TermsSection title="6. Content and records">
              <p>
                You retain ownership of content you submit. You grant us a limited license
                to host, process, reproduce, and display that content as necessary to
                operate and secure the Service. You represent that you have the rights and
                permissions needed to submit the content, including information about
                members, payees, events, and inventory.
              </p>
              <p className="mt-4">
                Administrators and organizations are responsible for the accuracy and
                lawful use of their records. We may remove content that violates these
                terms or creates legal, privacy, or security risk.
              </p>
            </TermsSection>

            <TermsSection title="7. Invoices, inventory, and receipt scanning">
              <p>
                Invoice, payment-status, audit, and inventory features are recordkeeping
                tools. Unless we expressly state otherwise, My Skool Club does not process
                payments, provide accounting advice, or guarantee the accuracy of records.
                Users and organizations must independently review financial information.
              </p>
              <p className="mt-4">
                Receipt scanning is optional and uses automated extraction that may make
                mistakes. You must verify extracted payee, price, quantity, and line-item
                information before saving or relying on it. Manual entry is available.
              </p>
            </TermsSection>

            <TermsSection title="8. Privacy">
              <p>
                Our <Link to="/privacy" className="font-semibold text-blue-700 underline">Privacy Policy</Link>{' '}
                explains how we collect, use, disclose, retain, and protect information.
                By using the Service, you acknowledge those practices.
              </p>
            </TermsSection>

            <TermsSection title="9. Account deletion, suspension, and termination">
              <p>
                You may request permanent account deletion through the mobile app. Some
                institutional, accounting, audit, and completed transaction records may be
                retained or reassigned to a non-personal deleted-user identity as described
                in the Privacy Policy.
              </p>
              <p className="mt-4">
                We may restrict, suspend, or terminate access when reasonably necessary to
                protect users or the Service, investigate misuse, comply with law, or
                enforce these terms. You may stop using the Service at any time.
              </p>
            </TermsSection>

            <TermsSection title="10. Third-party services">
              <p>
                The Service may rely on third-party hosting, email, artificial intelligence,
                app-store, and infrastructure providers. Their services may be governed by
                separate terms. We are not responsible for third-party services outside our
                reasonable control.
              </p>
            </TermsSection>

            <TermsSection title="11. Service availability and disclaimers">
              <p>
                We work to provide a reliable Service, but it may occasionally be
                unavailable, delayed, changed, or contain errors. To the maximum extent
                permitted by law, the Service is provided “as is” and “as available,”
                without warranties of uninterrupted operation, fitness for a particular
                purpose, or error-free results. Nothing in these terms excludes a warranty
                or right that cannot legally be excluded.
              </p>
            </TermsSection>

            <TermsSection title="12. Limitation of liability">
              <p>
                To the maximum extent permitted by law, My Skool Club will not be liable
                for indirect, incidental, special, consequential, or punitive damages, or
                for lost profits, data, goodwill, or opportunities arising from use of the
                Service. These limitations do not apply where prohibited by law.
              </p>
            </TermsSection>

            <TermsSection title="13. Changes to the Service or terms">
              <p>
                We may update the Service or these terms as features, risks, or legal
                requirements change. We will post revised terms and update the effective
                date. If a material change requires additional notice or consent, we will
                provide it. Continued use after an update takes effect constitutes
                acceptance where permitted by law.
              </p>
            </TermsSection>

            <TermsSection title="14. Contact">
              <p>
                For questions about these terms, email{' '}
                <a
                  href="mailto:support@myskoolclub.com"
                  className="font-semibold text-blue-700 underline decoration-blue-200 underline-offset-4 hover:text-blue-900"
                >
                  support@myskoolclub.com
                </a>
                .
              </p>
            </TermsSection>
          </div>
        </article>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-5 py-6 text-sm text-slate-500 sm:px-8">
          © {new Date().getFullYear()} My Skool Club
        </div>
      </footer>
    </div>
  );
}

function TermsSection({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-bold text-slate-950">{title}</h2>
      {children}
    </section>
  );
}
