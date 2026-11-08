import { Badge, Button } from '@respin/ui';

/** Viser Videro-temaet i Tailwind-klasser, og at utilities kan overstyre kit-komponenter. */
export function TailwindDemo() {
  return (
    <div className="flex w-full flex-wrap gap-4">
      <div data-testid="tw-card" className="w-[358px] max-w-full rounded-lg bg-surface p-gutter shadow-raised">
        <h3 className="text-h2 text-forest">Tailwind × Videro</h3>
        <p className="mt-2 text-body text-muted">Farver, typografi, radier og skygger fra tokens.</p>
        <div className="mt-4 flex gap-2">
          <span data-testid="tw-ink" className="rounded-md bg-grad-ink px-3 py-2 text-small text-cream">bg-grad-ink</span>
          <span className="rounded-md bg-grad-lime px-3 py-2 text-small text-slate">bg-grad-lime</span>
          <span data-testid="tw-op" className="rounded-md bg-forest/20 px-3 py-2 text-small text-forest-900">bg-forest/20</span>
        </div>
      </div>
      <div className="flex w-[358px] max-w-full flex-col gap-3 rounded-lg bg-sunken p-gutter">
        <Button data-testid="tw-pill" className="rounded-pill">Pille via rounded-pill</Button>
        <Button data-testid="tw-override" variant="outline" className="border-coral text-coral-600">Overstyret farve</Button>
        <div className="flex items-center gap-2"><Badge tone="forest">Kit</Badge><span className="h-tap min-w-tap rounded-md border border-line bg-canvas px-3 text-small leading-[44px]">h-tap</span></div>
      </div>
    </div>
  );
}
