import { Check, Sparkles } from 'lucide-react';
import type { EventInvitationTemplate, EventTypeOption } from './event.api';
import {
  getInvitationTemplatesForEventType,
  type InvitationTemplateDefinition,
} from './invitationTemplates';

type InvitationTemplateSelectorProps = {
  eventType: EventTypeOption;
  value: EventInvitationTemplate | null;
  disabled?: boolean;
  onChange: (template: EventInvitationTemplate) => void;
};

const getFontClassName = (fontStyle: InvitationTemplateDefinition['fontStyle']) => {
  switch (fontStyle) {
    case 'classic':
      return 'font-serif';

    case 'editorial':
      return 'font-serif tracking-[-0.025em]';

    case 'playful':
      return 'tracking-[-0.035em]';

    case 'modern':
    default:
      return 'tracking-[-0.04em]';
  }
};

export function InvitationTemplateSelector({
  eventType,
  value,
  disabled = false,
  onChange,
}: InvitationTemplateSelectorProps) {
  const templates = getInvitationTemplatesForEventType(eventType);

  return (
    <section
      aria-labelledby="invitation-template-selector-title"
      className="border-t border-white/65 pt-7"
    >
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.2)] text-[var(--color-deep-plum)]">
          <Sparkles aria-hidden="true" className="size-4" />
        </span>

        <div>
          <p
            id="invitation-template-selector-title"
            className="text-sm font-black text-[var(--color-near-black)]"
          >
            Invitation design
          </p>

          <p className="mt-0.5 text-xs leading-5 text-[var(--color-charcoal)]/50">
            Choose one design for every guest invitation created for this event.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {templates.map((template) => {
          const isSelected = value === template.id;

          return (
            <button
              key={template.id}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => {
                onChange(template.id);
              }}
              className={`group relative overflow-hidden rounded-[1.45rem] border p-0 text-left shadow-[0_14px_34px_rgba(31,27,29,0.08)] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/45 disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected
                  ? 'border-[var(--color-deep-plum)]/55 ring-2 ring-[var(--color-deep-plum)]/16'
                  : 'border-white/72 hover:-translate-y-1 hover:border-white hover:shadow-[0_20px_46px_rgba(31,27,29,0.14)]'
              }`}
            >
              <div
                className="relative min-h-44 overflow-hidden p-4"
                style={{
                  background: template.background,
                }}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1"
                  style={{
                    background: template.accent,
                  }}
                />

                <div
                  aria-hidden="true"
                  className="absolute -right-10 -top-10 size-32 rounded-full bg-white/24 blur-2xl transition duration-500 group-hover:scale-125"
                />

                <div
                  aria-hidden="true"
                  className="absolute bottom-3 right-4 text-xl opacity-50 transition duration-500 group-hover:-translate-y-1 group-hover:rotate-12"
                  style={{
                    color: template.textColor,
                  }}
                >
                  ✦
                </div>

                <div className="relative flex min-h-36 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="rounded-full border border-white/50 bg-white/28 px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] backdrop-blur-sm"
                      style={{
                        color: template.textColor,
                      }}
                    >
                      {template.previewLabel}
                    </span>

                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-full border transition ${
                        isSelected
                          ? 'border-transparent bg-[var(--color-deep-plum)] text-white'
                          : 'border-white/60 bg-white/24 text-transparent'
                      }`}
                    >
                      <Check aria-hidden="true" className="size-3.5" />
                    </span>
                  </div>

                  <div className="mt-auto">
                    <p
                      className="text-[0.58rem] font-black uppercase tracking-[0.18em]"
                      style={{
                        color: template.mutedTextColor,
                      }}
                    >
                      You’re invited
                    </p>

                    <p
                      className={`mt-2 max-w-[85%] text-xl font-black leading-tight ${getFontClassName(
                        template.fontStyle,
                      )}`}
                      style={{
                        color: template.textColor,
                      }}
                    >
                      {template.name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/54 px-4 py-3.5 backdrop-blur-xl">
                <p className="text-sm font-black text-[var(--color-near-black)]">{template.name}</p>

                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-charcoal)]/56">
                  {template.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
