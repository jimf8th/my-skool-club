import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const EFFECTIVE_DATE = 'August 8, 2026';

export default function PrivacyPolicy() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Privacy Policy | My Skool Club';
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
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Effective and last updated: {EFFECTIVE_DATE}
          </p>

          <div className="mt-8 space-y-9 text-[15px] leading-7 text-slate-700 sm:text-base">
            <PolicySection title="1. Scope">
              <p>
                This Privacy Policy explains how My Skool Club (“My Skool Club,” “we,”
                “us,” or “our”) collects, uses, shares, retains, and protects information
                when you use the My Skool Club website, mobile application, and related
                services (collectively, the “Service”).
              </p>
            </PolicySection>

            <PolicySection title="2. Information we collect">
              <ul className="list-disc space-y-3 pl-6">
                <li>
                  <strong>Account information:</strong> first and last name, email
                  address, password in hashed form, optional graduation year, account
                  role, and account-verification status.
                </li>
                <li>
                  <strong>School and club activity:</strong> membership requests,
                  approvals, roles, privileges, announcements, events, RSVPs, and
                  in-app notifications. This also includes abuse reports, the reported
                  content snapshot, report reason, and moderation outcome.
                </li>
                <li>
                  <strong>Financial and inventory records:</strong> invoice titles,
                  notes, payee names and email addresses, line items, approval and
                  payment history, inventory details, checkout dates, due dates, and
                  related notes.
                </li>
                <li>
                  <strong>Optional receipt images:</strong> when you choose the receipt
                  scanning feature, the photo you take or select is transmitted for
                  automated extraction. My Skool Club does not save the receipt image
                  as a separate file after processing. Extracted invoice information is
                  stored only if you choose to save it.
                </li>
                <li>
                  <strong>Technical information:</strong> authentication and request
                  timestamps, IP address, browser or device information, and diagnostic
                  or security logs that may be generated when the Service is used.
                </li>
              </ul>
              <p className="mt-4">
                We do not request access to your contacts, precise device location, or
                microphone. An event venue entered by a user is not device-location data.
              </p>
            </PolicySection>

            <PolicySection title="3. How we collect information">
              <p>
                We collect information directly from you when you register, join a school
                or club, create or respond to content, manage an invoice or inventory
                record, or contact us. Authorized administrators may also create or
                review organizational records involving your account. Limited technical
                information is collected automatically by our servers when you use the
                Service.
              </p>
            </PolicySection>

            <PolicySection title="4. How we use information">
              <ul className="list-disc space-y-2 pl-6">
                <li>Provide authentication and maintain your account.</li>
                <li>Operate school, club, event, announcement, invoice, and inventory features.</li>
                <li>Apply membership roles and access permissions.</li>
                <li>Send in-app notices and service-related communications.</li>
                <li>Process receipt images when you expressly choose the optional scanner.</li>
                <li>Protect the Service, prevent misuse, diagnose problems, and comply with law.</li>
              </ul>
              <p className="mt-4">
                We do not sell personal information, serve behavioral advertisements, or
                use personal information to track you across other companies’ apps or websites.
              </p>
            </PolicySection>

            <PolicySection title="5. How information is shared">
              <p>We may share information only as needed with:</p>
              <ul className="mt-3 list-disc space-y-3 pl-6">
                <li>
                  <strong>Authorized users:</strong> school or club administrators and
                  members who need the information to use organizational features.
                </li>
                <li>
                  <strong>Google Cloud:</strong> for application hosting, databases,
                  backups, networking, and related infrastructure.
                </li>
                <li>
                  <strong>OpenAI:</strong> a receipt image is sent to OpenAI only when
                  you choose the optional AI-assisted receipt scanner. You may enter
                  receipt information manually instead. OpenAI states that API inputs
                  and outputs are not used to train its models by default. OpenAI may
                  retain API request data for up to 30 days for abuse monitoring unless
                  enhanced data-retention controls apply.
                </li>
                <li>
                  <strong>Service providers:</strong> providers supporting email delivery,
                  security, maintenance, or similar operational functions.
                </li>
                <li>
                  <strong>Legal and safety recipients:</strong> when reasonably necessary
                  to comply with law, protect rights or safety, or investigate abuse.
                </li>
              </ul>
              <p className="mt-4">
                We require service providers that process personal information for us to
                protect it consistently with this policy and applicable privacy requirements.
              </p>
            </PolicySection>

            <PolicySection title="6. Camera and photo-library access">
              <p>
                Camera and photo-library access is optional and used only when you initiate
                receipt scanning. Your device asks for permission before access is granted.
                You may revoke that permission in device settings and enter invoice line
                items manually instead.
              </p>
            </PolicySection>

            <PolicySection title="7. Retention and account deletion">
              <p>
                We retain account and activity information while your account is active
                and as reasonably necessary to provide the Service, maintain security,
                resolve disputes, and satisfy legitimate legal or accounting obligations.
              </p>
              <p className="mt-4">
                You may permanently delete your account in the mobile app under{' '}
                <strong>Profile → Delete Account</strong>. Before deletion, checked-out
                inventory must be returned. Deletion removes your profile, credentials,
                memberships, notifications, RSVPs, authored events and announcements,
                verification and password-reset records, reports you submitted, and draft invoices.
              </p>
              <p className="mt-4">
                Schools, clubs, inventory records, finalized accounting records, and
                completed checkout history may be retained for institutional, audit, and
                accounting purposes. Your account association and matching invoice payee
                information are replaced with a non-personal “Deleted User” identity.
                Limited information may remain temporarily in routine backups or security
                logs until those records are overwritten or no longer needed.
              </p>
            </PolicySection>

            <PolicySection title="8. Your choices and rights">
              <p>
                You may decline optional camera or photo access, avoid the receipt scanner,
                update information through available account and administrator features,
                or delete your account in the app. Depending on where you live, you may
                also have rights to request access, correction, restriction, or deletion
                of personal information. Contact us to make a request.
              </p>
            </PolicySection>

            <PolicySection title="9. Security">
              <p>
                We use reasonable administrative, technical, and organizational safeguards,
                including encrypted network connections, password hashing, authentication,
                and role-based access controls. No system can guarantee absolute security.
              </p>
            </PolicySection>

            <PolicySection title="10. Children’s privacy">
              <p>
                The Service is not directed to children under 13, and children under 13
                should not create an account. Schools or organizations permitting minors
                to use the Service are responsible for obtaining any authorization required
                by applicable law. If you believe a child has provided information without
                appropriate authorization, contact us so we can review and remove it.
              </p>
            </PolicySection>

            <PolicySection title="11. Changes to this policy">
              <p>
                We may update this policy as the Service or legal requirements change.
                We will post the revised policy here and update the effective date. We
                will provide additional notice when required by law.
              </p>
            </PolicySection>

            <PolicySection title="12. Contact us">
              <p>
                For privacy questions or requests, email{' '}
                <a
                  href="mailto:support@myskoolclub.com"
                  className="font-semibold text-blue-700 underline decoration-blue-200 underline-offset-4 hover:text-blue-900"
                >
                  support@myskoolclub.com
                </a>
                .
              </p>
            </PolicySection>
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

function PolicySection({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-bold text-slate-950">{title}</h2>
      {children}
    </section>
  );
}
