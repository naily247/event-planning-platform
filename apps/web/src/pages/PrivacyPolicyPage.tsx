import {
  ArrowRight,
  BadgeCheck,
  Cookie,
  Database,
  FileKey2,
  LockKeyhole,
  Mail,
  Scale,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const privacySummary = [
  {
    title: 'Information you provide',
    description:
      'Account details, event information, vendor profiles, quotations, bookings, payments, reviews and support communications.',
    icon: Database,
  },
  {
    title: 'How information is used',
    description:
      'To operate Eventure, provide requested features, protect the platform and improve the experience.',
    icon: UserRoundCheck,
  },
  {
    title: 'How information is protected',
    description:
      'Administrative, technical and organisational safeguards are used to reduce unauthorised access, loss or misuse.',
    icon: LockKeyhole,
  },
];

const policySections = [
  {
    id: 'information-we-collect',
    number: '01',
    title: 'Information we collect',
    content: (
      <>
        <p>
          Eventure may collect information that you provide directly, data generated while you use
          the platform and limited technical information required to operate and protect the
          service.
        </p>

        <h3>Account and identity information</h3>

        <p>
          This may include your name, email address, telephone number, account role, authentication
          details and account status.
        </p>

        <h3>Customer and event information</h3>

        <p>
          Customers may provide event names, dates, locations, budgets, guest information, task
          details, planning notes, mood-board content, documents, invitation information and vendor
          preferences.
        </p>

        <h3>Vendor information</h3>

        <p>
          Vendors may provide business details, service categories, descriptions, portfolio content,
          packages, pricing information, availability, quotation responses and verification
          information.
        </p>

        <h3>Transaction and service information</h3>

        <p>
          Eventure may process information related to quotation requests, bookings, payment records,
          payment confirmations, complaints, reviews and communications between platform
          participants.
        </p>

        <h3>Technical information</h3>

        <p>
          Technical data may include device and browser information, internet protocol addresses,
          access times, requested pages, security events and diagnostic information.
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use-information',
    number: '02',
    title: 'How we use information',
    content: (
      <>
        <p>Information may be used to:</p>

        <ul>
          <li>Create, authenticate and manage user accounts.</li>
          <li>Provide customer, vendor and administrator workspaces.</li>
          <li>Support vendor discovery, quotation requests, bookings, payments and reviews.</li>
          <li>Store and organise event plans, guests, tasks, budgets and documents.</li>
          <li>Verify vendor applications and maintain marketplace quality.</li>
          <li>Investigate complaints, prevent abuse and protect platform security.</li>
          <li>
            Communicate about accounts, transactions, support requests and important service
            updates.
          </li>
          <li>Diagnose errors, monitor performance and improve the Eventure experience.</li>
          <li>Meet applicable legal and regulatory obligations.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'legal-basis',
    number: '03',
    title: 'Basis for processing',
    content: (
      <>
        <p>
          Depending on the circumstances, Eventure may process personal information because it is
          necessary to provide requested services, fulfil platform obligations, protect legitimate
          operational and security interests, comply with legal requirements or act with your
          consent.
        </p>

        <p>
          Where processing depends on consent, you may withdraw that consent, subject to any
          information that must be retained for legal, transactional or security reasons.
        </p>
      </>
    ),
  },
  {
    id: 'sharing-information',
    number: '04',
    title: 'How information may be shared',
    content: (
      <>
        <p>
          Eventure does not treat personal information as a product for sale. Information may,
          however, be shared where necessary to provide the platform and support legitimate
          operations.
        </p>

        <h3>Between customers and vendors</h3>

        <p>
          Information relevant to quotation requests, bookings, event requirements and service
          delivery may be shared between the customer and the selected vendor.
        </p>

        <h3>Service providers</h3>

        <p>
          Information may be processed by service providers supporting areas such as hosting, cloud
          storage, image and document delivery, communications, analytics, payment processing and
          security.
        </p>

        <h3>Legal and safety requirements</h3>

        <p>
          Information may be disclosed when reasonably necessary to comply with law, respond to
          lawful requests, enforce platform terms, investigate misuse or protect users, Eventure and
          the public.
        </p>

        <h3>Business changes</h3>

        <p>
          If Eventure is involved in a merger, acquisition, restructuring or transfer of platform
          assets, information may be included in that process subject to appropriate confidentiality
          and legal safeguards.
        </p>
      </>
    ),
  },
  {
    id: 'payments',
    number: '05',
    title: 'Payments and financial information',
    content: (
      <>
        <p>
          Eventure may store transaction references, payment status, amounts, dates, uploaded
          payment evidence and related booking information.
        </p>

        <p>
          Where an external payment provider is used, payment credentials may be collected and
          processed directly by that provider under its own privacy and security practices. Eventure
          should not be used to send passwords, full card details or other sensitive payment
          credentials through ordinary messages or complaint forms.
        </p>
      </>
    ),
  },
  {
    id: 'files-and-content',
    number: '06',
    title: 'Files and user content',
    content: (
      <>
        <p>
          Users may upload portfolio images, event documents, payment evidence, complaint
          attachments and other content required by platform workflows.
        </p>

        <p>
          You should only upload information that you are authorised to use and share. Avoid
          uploading unnecessary sensitive information, identity documents or confidential
          third-party material unless the platform specifically requests it through an appropriate
          workflow.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    number: '07',
    title: 'Cookies and local storage',
    content: (
      <>
        <p>
          Eventure may use browser storage, cookies or similar technologies to maintain sessions,
          remember essential preferences, protect accounts and understand technical performance.
        </p>

        <p>
          Essential storage may be required for authentication and core platform functionality.
          Additional analytics or preference technologies should be described through an appropriate
          consent mechanism before being introduced.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    number: '08',
    title: 'How long information is retained',
    content: (
      <>
        <p>
          Information is retained only for as long as reasonably necessary for the purposes
          described in this policy, including providing services, maintaining transaction and
          dispute records, meeting legal obligations, preventing abuse and protecting platform
          integrity.
        </p>

        <p>
          Retention periods may differ depending on the type of information, account status,
          transaction history, unresolved complaints and applicable legal requirements.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    number: '09',
    title: 'Security',
    content: (
      <>
        <p>
          Eventure uses reasonable administrative, technical and organisational measures intended to
          protect personal information against unauthorised access, alteration, disclosure, loss or
          destruction.
        </p>

        <p>
          No online system can guarantee absolute security. Users are responsible for protecting
          their login credentials, using secure devices and notifying Eventure promptly if they
          suspect unauthorised account activity.
        </p>
      </>
    ),
  },
  {
    id: 'your-rights',
    number: '10',
    title: 'Your choices and rights',
    content: (
      <>
        <p>
          Depending on applicable law and the circumstances of the request, you may have rights
          relating to your personal information, including the ability to:
        </p>

        <ul>
          <li>Request access to personal information held about you.</li>
          <li>Request correction of inaccurate or incomplete information.</li>
          <li>Request deletion where retention is no longer justified.</li>
          <li>Object to or restrict certain processing activities.</li>
          <li>Withdraw consent where processing depends on consent.</li>
          <li>Request information about how your personal data is being used.</li>
        </ul>

        <p>
          Eventure may need to verify your identity before acting on a request. Some requests may be
          limited where information must be retained to complete transactions, resolve disputes,
          protect security or comply with law.
        </p>
      </>
    ),
  },
  {
    id: 'children',
    number: '11',
    title: 'Children’s privacy',
    content: (
      <>
        <p>
          Eventure is intended for people who are legally able to create and manage accounts and
          enter platform transactions. The service is not designed for children to use
          independently.
        </p>

        <p>
          Guest information relating to children should only be added by an authorised adult and
          should be limited to what is genuinely required for event planning.
        </p>
      </>
    ),
  },
  {
    id: 'international-processing',
    number: '12',
    title: 'International processing',
    content: (
      <>
        <p>
          Some technology and infrastructure providers may process information in countries outside
          your location. Where this occurs, Eventure should use appropriate contractual,
          organisational and technical safeguards required by applicable law.
        </p>
      </>
    ),
  },
  {
    id: 'policy-updates',
    number: '13',
    title: 'Changes to this policy',
    content: (
      <>
        <p>
          This policy may be updated as Eventure develops, introduces new features, changes service
          providers or responds to legal and operational requirements.
        </p>

        <p>
          Material changes should be communicated through the platform or another appropriate
          channel. The date shown at the top of this page indicates when the policy was last
          updated.
        </p>
      </>
    ),
  },
];

export function PrivacyPolicyPage() {
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
                <ShieldCheck className="size-4" />
                Privacy at Eventure
              </div>

              <h1 className="mt-8 text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl lg:text-7xl">
                Your information deserves
                <span className="block text-[var(--color-deep-plum)]">thoughtful protection.</span>
              </h1>

              <p className="mt-8 max-w-3xl text-base font-medium leading-8 text-[var(--color-charcoal)]/70 sm:text-lg">
                This policy explains what information Eventure may collect, why it is used, when it
                may be shared and the choices available to people who use the platform.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/55 bg-white/30 p-6 shadow-[0_22px_65px_rgba(31,27,29,0.08)] backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                Policy information
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
                    Eventure platform users
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-6">
                  <dt className="text-sm font-semibold text-[var(--color-charcoal)]/58">Contact</dt>

                  <dd>
                    <Link
                      to="/contact"
                      className="text-sm font-black text-[var(--color-deep-plum)] transition hover:text-[var(--color-rosewood)]"
                    >
                      Contact Eventure
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
          {privacySummary.map((item) => {
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

                <nav aria-label="Privacy policy sections" className="mt-6 space-y-1">
                  {policySections.map((section) => (
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
                    This policy is written to explain Eventure’s intended data practices clearly.
                    Actual processing must remain consistent with the platform’s implemented
                    features, providers and legal obligations.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {policySections.map((section) => (
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

                        <div className="policy-content mt-6 space-y-5 text-sm font-medium leading-7 text-[var(--color-charcoal)]/68 sm:text-base sm:leading-8 [&_h3]:mt-7 [&_h3]:text-base [&_h3]:font-black [&_h3]:text-[var(--color-near-black)] [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
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
                  Questions about your information?
                </p>
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Contact Eventure with a privacy-related enquiry.
              </h2>

              <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-white/62 sm:text-base">
                Provide enough detail to identify your account and request, but do not send
                passwords, full payment credentials or unnecessary sensitive information.
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
