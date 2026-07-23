import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Mail,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const enquiryTypes = [
  {
    title: 'Planning support',
    description:
      'Questions about creating an event, discovering vendors or managing your planning workspace.',
    icon: CalendarDays,
  },
  {
    title: 'Vendor enquiries',
    description:
      'Guidance for vendor registration, profile setup, quotations, availability and bookings.',
    icon: Building2,
  },
  {
    title: 'Account assistance',
    description:
      'Help with access, account settings or understanding the correct workspace for your role.',
    icon: UserRound,
  },
];

const helpfulLinks = [
  {
    title: 'Planning guide',
    description:
      'See how Eventure supports the planning journey from event setup to confirmed bookings.',
    to: '/planning-guide',
    icon: CircleHelp,
  },
  {
    title: 'Explore vendors',
    description: 'Browse vendor profiles, services, portfolios, reviews and availability.',
    to: '/vendors',
    icon: Sparkles,
  },
  {
    title: 'Access your account',
    description:
      'Sign in to continue managing events, vendor operations or platform administration.',
    to: '/login',
    icon: ShieldCheck,
  },
];

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const name = String(formData.get('name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const enquiryType = String(formData.get('enquiryType') ?? '').trim();
    const subject = String(formData.get('subject') ?? '').trim();
    const message = String(formData.get('message') ?? '').trim();

    const emailSubject = encodeURIComponent(subject || `Eventure enquiry from ${name}`);

    const emailBody = encodeURIComponent(
      [`Name: ${name}`, `Email: ${email}`, `Enquiry type: ${enquiryType}`, '', message].join('\n'),
    );

    window.location.href = `mailto:support@eventure.com?subject=${emailSubject}&body=${emailBody}`;
    setSubmitted(true);
  }

  return (
    <div className="overflow-hidden">
      <section className="relative overflow-hidden border-b border-white/35">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-28 top-8 size-80 rounded-full bg-[var(--color-powder-blue)]/20 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 bottom-0 size-96 rounded-full bg-[var(--color-lilac)]/20 blur-3xl"
        />

        <div className="page-container relative py-16 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/35 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-deep-plum)] shadow-[0_14px_40px_rgba(31,27,29,0.08)] backdrop-blur-xl">
                <MessageSquareText className="size-4" />
                Contact Eventure
              </div>

              <h1 className="mt-8 text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl lg:text-7xl">
                Let’s make your next step
                <span className="block text-[var(--color-deep-plum)]">a little clearer.</span>
              </h1>

              <p className="mt-8 max-w-2xl text-base font-medium leading-8 text-[var(--color-charcoal)]/70 sm:text-lg">
                Whether you are planning an event, setting up a vendor presence or looking for
                account guidance, share what you need help with and provide enough detail for the
                enquiry to be understood clearly.
              </p>
            </div>

            <div className="rounded-[2.25rem] border border-white/55 bg-white/30 p-6 shadow-[0_28px_80px_rgba(31,27,29,0.1)] backdrop-blur-xl sm:p-8">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/60 bg-white/45 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.08)]">
                  <Mail className="size-5" />
                </span>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                    Before sending
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                    Include the details that matter.
                  </h2>
                </div>
              </div>

              <div className="mt-7 space-y-4">
                {[
                  'Tell us whether you are a customer, vendor or general visitor.',
                  'Describe the page, workflow or account area involved.',
                  'Avoid including passwords, payment credentials or sensitive documents.',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-white/50 bg-white/28 px-4 py-4"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-deep-plum)]" />

                    <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/68">
                      {item}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[var(--color-deep-plum)]/8 px-4 py-4">
                <Clock3 className="size-4 shrink-0 text-[var(--color-deep-plum)]" />

                <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/68">
                  Clear context helps enquiries reach the right area faster.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container py-16 sm:py-20 lg:py-24">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
            How can we help?
          </p>

          <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.045em] text-[var(--color-near-black)] sm:text-5xl">
            Choose the path that best matches your enquiry.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {enquiryTypes.map((enquiryType) => {
            const Icon = enquiryType.icon;

            return (
              <article
                key={enquiryType.title}
                className="rounded-[2rem] border border-white/55 bg-white/30 p-7 shadow-[0_20px_60px_rgba(31,27,29,0.08)] backdrop-blur-xl sm:p-8"
              >
                <span className="grid size-12 place-items-center rounded-2xl border border-white/60 bg-white/45 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.08)]">
                  <Icon className="size-5" />
                </span>

                <h3 className="mt-7 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  {enquiryType.title}
                </h3>

                <p className="mt-4 text-sm font-medium leading-7 text-[var(--color-charcoal)]/65">
                  {enquiryType.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-white/35 bg-white/16">
        <div className="page-container py-16 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Send an enquiry
              </p>

              <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.045em] text-[var(--color-near-black)] sm:text-5xl">
                Tell us what you need help with.
              </h2>

              <p className="mt-6 text-base font-medium leading-8 text-[var(--color-charcoal)]/68">
                Complete the form and your email application will open with the enquiry prepared for
                you to review before sending.
              </p>

              {submitted ? (
                <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[var(--color-dusty-olive)]/20 bg-[var(--color-dusty-olive)]/10 p-4">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--color-dusty-olive)]" />

                  <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/72">
                    Your email application should now be open. Review the prepared message before
                    sending it.
                  </p>
                </div>
              ) : null}
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-[2.25rem] border border-white/60 bg-white/35 p-6 shadow-[0_24px_70px_rgba(31,27,29,0.09)] backdrop-blur-xl sm:p-8"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-black text-[var(--color-near-black)]">Name</span>

                  <input
                    required
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="Your name"
                    className="min-h-12 w-full rounded-2xl border border-white/65 bg-white/48 px-4 text-sm font-semibold text-[var(--color-charcoal)] outline-none transition placeholder:text-[var(--color-charcoal)]/38 focus:border-[var(--color-deep-plum)]/35 focus:ring-4 focus:ring-[var(--color-deep-plum)]/8"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-black text-[var(--color-near-black)]">Email</span>

                  <input
                    required
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="min-h-12 w-full rounded-2xl border border-white/65 bg-white/48 px-4 text-sm font-semibold text-[var(--color-charcoal)] outline-none transition placeholder:text-[var(--color-charcoal)]/38 focus:border-[var(--color-deep-plum)]/35 focus:ring-4 focus:ring-[var(--color-deep-plum)]/8"
                  />
                </label>
              </div>

              <label className="mt-5 block space-y-2">
                <span className="text-sm font-black text-[var(--color-near-black)]">
                  Enquiry type
                </span>

                <select
                  required
                  name="enquiryType"
                  defaultValue=""
                  className="min-h-12 w-full rounded-2xl border border-white/65 bg-white/48 px-4 text-sm font-semibold text-[var(--color-charcoal)] outline-none transition focus:border-[var(--color-deep-plum)]/35 focus:ring-4 focus:ring-[var(--color-deep-plum)]/8"
                >
                  <option value="" disabled>
                    Select an enquiry type
                  </option>
                  <option value="Planning support">Planning support</option>
                  <option value="Vendor enquiry">Vendor enquiry</option>
                  <option value="Account assistance">Account assistance</option>
                  <option value="General enquiry">General enquiry</option>
                </select>
              </label>

              <label className="mt-5 block space-y-2">
                <span className="text-sm font-black text-[var(--color-near-black)]">Subject</span>

                <input
                  required
                  type="text"
                  name="subject"
                  placeholder="A brief summary of your enquiry"
                  className="min-h-12 w-full rounded-2xl border border-white/65 bg-white/48 px-4 text-sm font-semibold text-[var(--color-charcoal)] outline-none transition placeholder:text-[var(--color-charcoal)]/38 focus:border-[var(--color-deep-plum)]/35 focus:ring-4 focus:ring-[var(--color-deep-plum)]/8"
                />
              </label>

              <label className="mt-5 block space-y-2">
                <span className="text-sm font-black text-[var(--color-near-black)]">Message</span>

                <textarea
                  required
                  name="message"
                  rows={6}
                  placeholder="Describe what happened, what you expected and any relevant details."
                  className="w-full resize-y rounded-2xl border border-white/65 bg-white/48 px-4 py-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)] outline-none transition placeholder:text-[var(--color-charcoal)]/38 focus:border-[var(--color-deep-plum)]/35 focus:ring-4 focus:ring-[var(--color-deep-plum)]/8"
                />
              </label>

              <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-sm text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                  Do not include passwords, full payment details or other sensitive information.
                </p>

                <button type="submit" className="btn-primary min-h-12 px-6">
                  Prepare email
                  <Send className="size-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="page-container py-16 sm:py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-20">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
              Find your answer faster
            </p>

            <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.045em] text-[var(--color-near-black)] sm:text-5xl">
              The next step may already be waiting for you.
            </h2>

            <p className="mt-6 text-base font-medium leading-8 text-[var(--color-charcoal)]/68">
              These areas cover the most common starting points across Eventure’s public experience.
            </p>
          </div>

          <div className="space-y-4">
            {helpfulLinks.map((helpfulLink) => {
              const Icon = helpfulLink.icon;

              return (
                <Link
                  key={helpfulLink.title}
                  to={helpfulLink.to}
                  className="group flex items-center gap-5 rounded-[1.75rem] border border-white/60 bg-white/32 p-5 shadow-[0_16px_46px_rgba(31,27,29,0.07)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/44 sm:p-6"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/60 bg-white/45 text-[var(--color-deep-plum)]">
                    <Icon className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                      {helpfulLink.title}
                    </h3>

                    <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-charcoal)]/62">
                      {helpfulLink.description}
                    </p>
                  </div>

                  <ArrowRight className="size-5 shrink-0 text-[var(--color-deep-plum)] transition group-hover:translate-x-1" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
