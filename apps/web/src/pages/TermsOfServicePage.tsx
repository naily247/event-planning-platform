import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  CalendarCheck2,
  FileCheck2,
  Gavel,
  Handshake,
  MessageSquareWarning,
  Scale,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const termsSummary = [
  {
    title: 'Use Eventure responsibly',
    description:
      'Provide accurate information, protect your account and use platform features only for lawful event-related purposes.',
    icon: UserRoundCheck,
  },
  {
    title: 'Customers and vendors contract directly',
    description:
      'Eventure supports discovery, quotations and coordination but does not perform the vendor’s event services.',
    icon: Handshake,
  },
  {
    title: 'Transactions require careful review',
    description:
      'Users should review pricing, deposits, deliverables, cancellation terms and vendor conditions before confirming.',
    icon: FileCheck2,
  },
];

const termsSections = [
  {
    id: 'acceptance',
    number: '01',
    title: 'Acceptance of these terms',
    content: (
      <>
        <p>
          These Terms of Service govern access to and use of Eventure, including its public website,
          customer workspace, vendor workspace, administrative features and related services.
        </p>

        <p>
          By creating an account, accessing a protected workspace or using an Eventure feature, you
          agree to follow these terms and the Privacy Policy.
        </p>

        <p>
          Do not use Eventure if you do not agree to these terms or are not legally able to enter a
          binding agreement.
        </p>
      </>
    ),
  },
  {
    id: 'platform-role',
    number: '02',
    title: 'Eventure’s role',
    content: (
      <>
        <p>
          Eventure is a technology platform designed to help customers plan events and coordinate
          with independent vendors.
        </p>

        <p>
          The platform may support event workspaces, vendor discovery, quotation requests,
          quotations, bookings, payments, reviews, documents, complaints and related planning
          activities.
        </p>

        <p>
          Unless expressly stated otherwise, Eventure is not the provider of the photography,
          catering, decoration, venue, entertainment, transport or other event services advertised
          by vendors.
        </p>

        <p>
          Customers and vendors remain responsible for the agreements they enter into with each
          other.
        </p>
      </>
    ),
  },
  {
    id: 'accounts',
    number: '03',
    title: 'Accounts and eligibility',
    content: (
      <>
        <p>
          You must provide accurate and current information when creating and maintaining an
          Eventure account.
        </p>

        <p>
          You are responsible for safeguarding your login credentials and for activity performed
          through your account unless unauthorised use is reported promptly.
        </p>

        <p>
          You must not create accounts using false identities, impersonate another person or
          organisation, share accounts in a way that compromises security or attempt to access
          another user’s workspace.
        </p>

        <p>
          Eventure may require identity, business or contact verification before allowing access to
          certain features.
        </p>
      </>
    ),
  },
  {
    id: 'customer-responsibilities',
    number: '04',
    title: 'Customer responsibilities',
    content: (
      <>
        <p>Customers are responsible for:</p>

        <ul>
          <li>
            Providing accurate event requirements, dates, locations, budgets and service
            expectations.
          </li>
          <li>
            Reviewing vendor profiles, quotations, availability and terms before making decisions.
          </li>
          <li>Confirming that selected services are suitable for the intended event.</li>
          <li>Paying agreed amounts according to the accepted quotation and booking conditions.</li>
          <li>
            Communicating material changes that may affect pricing, availability or service
            delivery.
          </li>
          <li>Treating vendors and other platform users respectfully and lawfully.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'vendor-responsibilities',
    number: '05',
    title: 'Vendor responsibilities',
    content: (
      <>
        <p>Vendors are responsible for:</p>

        <ul>
          <li>
            Providing truthful business, service, portfolio, pricing and availability information.
          </li>
          <li>
            Maintaining any licences, permissions, insurance or professional qualifications required
            for their services.
          </li>
          <li>
            Issuing clear quotations that accurately describe prices, deposits, inclusions,
            exclusions and important conditions.
          </li>
          <li>Delivering confirmed services professionally and according to the agreed booking.</li>
          <li>Communicating delays, conflicts or other material issues promptly.</li>
          <li>
            Respecting customer information and using it only for legitimate event-service purposes.
          </li>
        </ul>

        <p>
          Vendor approval or verification does not constitute a guarantee of future availability,
          performance, suitability or service quality.
        </p>
      </>
    ),
  },
  {
    id: 'quotations',
    number: '06',
    title: 'Quotation requests and quotations',
    content: (
      <>
        <p>
          A quotation request allows a customer to communicate event requirements to a vendor. It
          does not create a confirmed booking.
        </p>

        <p>
          Vendors are responsible for ensuring that quotations clearly state the proposed services,
          total price, payment expectations, validity period, deliverables and relevant conditions.
        </p>

        <p>
          Customers should review the full quotation before accepting it. Acceptance indicates an
          intention to proceed under the stated conditions but may still require booking creation,
          vendor confirmation or payment.
        </p>

        <p>
          Quotations may be revised, rejected, withdrawn or allowed to expire according to the
          workflow and circumstances of the transaction.
        </p>
      </>
    ),
  },
  {
    id: 'bookings',
    number: '07',
    title: 'Bookings and service agreements',
    content: (
      <>
        <p>
          A booking may be created after a quotation is accepted. A booking is not necessarily final
          until the vendor confirms it and any required deposit or payment condition is satisfied.
        </p>

        <p>
          The accepted quotation, confirmed booking information and any additional written
          conditions exchanged between the customer and vendor may form part of their service
          agreement.
        </p>

        <p>
          Customers and vendors should independently preserve important transaction details,
          receipts and communications.
        </p>

        <p>
          Eventure may display booking statuses to support coordination, but those statuses do not
          replace the parties’ responsibility to understand and fulfil their agreement.
        </p>
      </>
    ),
  },
  {
    id: 'payments',
    number: '08',
    title: 'Payments, deposits and evidence',
    content: (
      <>
        <p>
          Eventure may support manual payment records, uploaded payment evidence and external
          payment-provider checkout sessions.
        </p>

        <p>Payment availability, processing times, fees and supported methods may vary.</p>

        <p>
          A displayed payment status may be subject to confirmation, verification, reversal,
          rejection or provider processing.
        </p>

        <p>
          Users must not upload false payment evidence, manipulate transaction records or attempt to
          obtain services without paying agreed amounts.
        </p>

        <p>
          External payment providers may apply their own terms, privacy policies, security controls
          and dispute procedures.
        </p>
      </>
    ),
  },
  {
    id: 'cancellations',
    number: '09',
    title: 'Cancellations, refunds and changes',
    content: (
      <>
        <p>
          Cancellation and refund rights may depend on the accepted quotation, vendor conditions,
          payment status, timing, work already completed and applicable law.
        </p>

        <p>
          Eventure does not automatically guarantee that a cancellation will result in a full or
          partial refund.
        </p>

        <p>
          Customers and vendors should state cancellation and rescheduling conditions clearly before
          confirmation.
        </p>

        <p>
          Where Eventure provides a cancellation control, using that control records the requested
          platform action but does not remove any outstanding contractual or financial obligations
          between the parties.
        </p>
      </>
    ),
  },
  {
    id: 'content',
    number: '10',
    title: 'User content and uploaded files',
    content: (
      <>
        <p>
          Users may submit event information, portfolio images, descriptions, reviews, messages,
          documents, payment evidence and complaint attachments.
        </p>

        <p>
          You retain responsibility for content you submit and must have the rights and permissions
          required to use it.
        </p>

        <p>You must not submit content that:</p>

        <ul>
          <li>Is unlawful, fraudulent, threatening or misleading.</li>
          <li>Infringes intellectual-property or privacy rights.</li>
          <li>Contains malware or harmful technical material.</li>
          <li>
            Includes confidential or sensitive information that is unnecessary for the platform
            workflow.
          </li>
          <li>Is designed to harass, impersonate or damage another person or business unfairly.</li>
        </ul>

        <p>
          You grant Eventure the limited permission necessary to host, process, display and transmit
          submitted content for operating the platform.
        </p>
      </>
    ),
  },
  {
    id: 'reviews',
    number: '11',
    title: 'Reviews and marketplace feedback',
    content: (
      <>
        <p>Reviews should reflect genuine experiences associated with completed bookings.</p>

        <p>
          Reviews must not contain fabricated claims, irrelevant personal attacks, private
          information, coercion, discriminatory content or undisclosed promotional material.
        </p>

        <p>
          Eventure may investigate, hide or remove reviews that violate these terms or undermine the
          integrity of the review system.
        </p>

        <p>
          Moderation does not mean that Eventure independently verifies every factual statement
          contained in a review.
        </p>
      </>
    ),
  },
  {
    id: 'complaints',
    number: '12',
    title: 'Complaints and disputes',
    content: (
      <>
        <p>
          Customers and vendors may use available complaint workflows to provide information about
          booking, payment, conduct or service concerns.
        </p>

        <p>
          Users must cooperate honestly with reasonable requests for information and must not submit
          altered evidence or intentionally misleading allegations.
        </p>

        <p>
          Eventure may review platform records, messages, booking details, uploaded evidence and
          account activity when investigating a complaint.
        </p>

        <p>
          Eventure may assist communication or take platform-level action, but it does not
          necessarily act as a court, arbitrator, insurer or guarantor of compensation.
        </p>
      </>
    ),
  },
  {
    id: 'prohibited-use',
    number: '13',
    title: 'Prohibited use',
    content: (
      <>
        <p>You must not:</p>

        <ul>
          <li>Use Eventure for illegal or deceptive activity.</li>
          <li>Circumvent account restrictions, security controls or access permissions.</li>
          <li>Scrape, copy or systematically extract platform data without authorisation.</li>
          <li>Interfere with platform availability, performance or infrastructure.</li>
          <li>
            Upload malicious code or attempt to discover security vulnerabilities without
            permission.
          </li>
          <li>
            Manipulate reviews, quotations, bookings, payment records or verification processes.
          </li>
          <li>Use platform information to spam, harass or unlawfully profile users.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'suspension',
    number: '14',
    title: 'Account restriction and termination',
    content: (
      <>
        <p>
          Eventure may restrict, suspend or deactivate an account where reasonably necessary to
          protect users, investigate suspected misuse, comply with law or enforce these terms.
        </p>

        <p>
          Depending on the circumstances, Eventure may provide notice and an opportunity to respond
          before permanent action is taken.
        </p>

        <p>
          Serious fraud, security abuse, unlawful conduct or immediate risks to users may require
          action without advance notice.
        </p>

        <p>
          Termination does not automatically remove obligations arising from existing transactions,
          disputes or unpaid amounts.
        </p>
      </>
    ),
  },
  {
    id: 'availability',
    number: '15',
    title: 'Platform availability and changes',
    content: (
      <>
        <p>
          Eventure may update, improve, replace or discontinue features as the platform develops.
        </p>

        <p>
          Temporary interruptions may occur because of maintenance, software errors, infrastructure
          failures, provider outages, security events or circumstances outside reasonable control.
        </p>

        <p>
          Eventure does not guarantee that every feature will always be available without delay,
          interruption or error.
        </p>
      </>
    ),
  },
  {
    id: 'disclaimers',
    number: '16',
    title: 'Disclaimers',
    content: (
      <>
        <p>
          Vendor profiles, portfolios, pricing, reviews and availability are provided for
          coordination and decision-making purposes.
        </p>

        <p>
          Customers remain responsible for deciding whether a vendor is appropriate for their event.
        </p>

        <p>
          Eventure does not guarantee that a vendor will meet every expectation or that an event
          will proceed without disruption.
        </p>

        <p>
          To the extent permitted by applicable law, the platform is provided without warranties
          that cannot reasonably be offered for independent third-party services.
        </p>
      </>
    ),
  },
  {
    id: 'liability',
    number: '17',
    title: 'Limitation of responsibility',
    content: (
      <>
        <p>
          To the extent permitted by applicable law, Eventure is not responsible for indirect,
          incidental or consequential loss arising from independent vendor services, event
          cancellation, user conduct, inaccurate user information or circumstances beyond reasonable
          platform control.
        </p>

        <p>
          Nothing in these terms excludes or limits responsibility where doing so would be unlawful.
        </p>

        <p>
          Any final limitation of liability, financial cap or jurisdictional exclusion must be
          reviewed and approved before Eventure is launched commercially.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    number: '18',
    title: 'Changes to these terms',
    content: (
      <>
        <p>
          Eventure may update these terms when features, business practices, legal requirements or
          platform risks change.
        </p>

        <p>
          Material updates should be communicated through the platform or another reasonable
          channel.
        </p>

        <p>
          Continued use after an updated version becomes effective may constitute acceptance where
          permitted by law.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    number: '19',
    title: 'Contact and legal notices',
    content: (
      <>
        <p>Questions about these terms may be submitted through the Eventure contact page.</p>

        <p>
          Before commercial launch, Eventure should publish the legal name and address of the
          platform operator, an official contact email and any registration or jurisdiction
          information required by applicable law.
        </p>
      </>
    ),
  },
];

export function TermsOfServicePage() {
  return (
    <div className="overflow-hidden">
      <section className="relative overflow-hidden border-b border-white/35">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-28 top-0 size-80 rounded-full bg-[var(--color-powder-blue)]/20 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 bottom-0 size-96 rounded-full bg-[var(--color-lilac)]/20 blur-3xl"
        />

        <div className="page-container relative py-16 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-end lg:gap-20">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/35 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-deep-plum)] shadow-[0_14px_40px_rgba(31,27,29,0.08)] backdrop-blur-xl">
                <Gavel className="size-4" />
                Terms of Service
              </div>

              <h1 className="mt-8 text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl lg:text-7xl">
                Clear expectations create
                <span className="block text-[var(--color-deep-plum)]">better coordination.</span>
              </h1>

              <p className="mt-8 max-w-3xl text-base font-medium leading-8 text-[var(--color-charcoal)]/70 sm:text-lg">
                These terms explain the responsibilities that apply when customers, vendors and
                other users access Eventure and use its planning, marketplace and transaction
                features.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/55 bg-white/30 p-6 shadow-[0_22px_65px_rgba(31,27,29,0.08)] backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                Terms information
              </p>

              <dl className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-6 border-b border-[var(--color-charcoal)]/8 pb-4">
                  <dt className="text-sm font-semibold text-[var(--color-charcoal)]/58">
                    Last updated
                  </dt>

                  <dd className="text-sm font-black text-[var(--color-near-black)]">
                    21 July 2026
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-6 border-b border-[var(--color-charcoal)]/8 pb-4">
                  <dt className="text-sm font-semibold text-[var(--color-charcoal)]/58">
                    Applies to
                  </dt>

                  <dd className="text-right text-sm font-black text-[var(--color-near-black)]">
                    All Eventure users
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-6">
                  <dt className="text-sm font-semibold text-[var(--color-charcoal)]/58">
                    Related policy
                  </dt>

                  <dd>
                    <Link
                      to="/privacy"
                      className="text-sm font-black text-[var(--color-deep-plum)] transition hover:text-[var(--color-rosewood)]"
                    >
                      Privacy Policy
                    </Link>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container py-14 sm:py-16 lg:py-20">
        <div className="grid gap-5 lg:grid-cols-3">
          {termsSummary.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="rounded-[2rem] border border-white/55 bg-white/30 p-7 shadow-[0_20px_60px_rgba(31,27,29,0.08)] backdrop-blur-xl"
              >
                <span className="grid size-12 place-items-center rounded-2xl border border-white/60 bg-white/45 text-[var(--color-deep-plum)]">
                  <Icon className="size-5" />
                </span>

                <h2 className="mt-6 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                  {item.title}
                </h2>

                <p className="mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/65">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-white/35 bg-white/16">
        <div className="page-container py-16 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.34fr_1fr] lg:gap-16">
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-[2rem] border border-white/60 bg-white/32 p-6 shadow-[0_18px_55px_rgba(31,27,29,0.07)] backdrop-blur-xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                  On this page
                </p>

                <nav
                  aria-label="Terms of service sections"
                  className="mt-6 max-h-[68vh] space-y-1 overflow-y-auto pr-1"
                >
                  {termsSections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--color-charcoal)]/62 transition hover:bg-white/45 hover:text-[var(--color-deep-plum)]"
                    >
                      <span className="text-[10px] font-black tracking-[0.12em] text-[var(--color-rosewood)]">
                        {section.number}
                      </span>

                      <span>{section.title}</span>
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="min-w-0">
              <div className="mb-6 rounded-[1.75rem] border border-[var(--color-dusty-olive)]/20 bg-[var(--color-dusty-olive)]/8 p-5">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 size-5 shrink-0 text-[var(--color-dusty-olive)]" />

                  <p className="text-sm font-semibold leading-7 text-[var(--color-charcoal)]/70">
                    These terms describe Eventure’s intended operational model. The final commercial
                    version must reflect the actual platform operator, payment arrangements,
                    policies and applicable legal requirements.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {termsSections.map((section) => (
                  <article
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-28 rounded-[2rem] border border-white/60 bg-white/34 p-6 shadow-[0_20px_62px_rgba(31,27,29,0.07)] backdrop-blur-xl sm:p-8"
                  >
                    <div className="flex items-start gap-5">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-deep-plum)]/9 text-xs font-black tracking-[0.12em] text-[var(--color-deep-plum)]">
                        {section.number}
                      </span>

                      <div className="min-w-0 flex-1">
                        <h2 className="text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)] sm:text-3xl">
                          {section.title}
                        </h2>

                        <div className="mt-6 space-y-5 text-sm font-medium leading-7 text-[var(--color-charcoal)]/68 sm:text-base sm:leading-8 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                          {section.content}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container py-14 sm:py-16 lg:py-20">
        <div className="relative overflow-hidden rounded-[2.25rem] border border-white/55 bg-[var(--color-near-black)] px-6 py-12 text-white shadow-[0_28px_85px_rgba(31,27,29,0.2)] sm:px-10 lg:px-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 -top-20 size-64 rounded-full bg-[var(--color-deep-plum)]/35 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-16 size-64 rounded-full bg-[var(--color-powder-blue)]/15 blur-3xl"
          />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <Scale className="size-5 text-[var(--color-light-champagne)]" />

                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-light-champagne)]">
                  Need clarification?
                </p>
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Contact Eventure about these terms.
              </h2>

              <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-white/62 sm:text-base">
                Share the feature, transaction or section involved so the enquiry can be understood
                clearly.
              </p>
            </div>

            <Link
              to="/contact"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black !text-[var(--color-deep-plum)] shadow-[0_16px_42px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[var(--color-light-champagne)] hover:!text-[var(--color-deep-plum)]"
            >
              Contact Eventure
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
