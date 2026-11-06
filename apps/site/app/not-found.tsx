import { Button, EmptyState } from '@respin/ui';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState headingLevel={1} icon="search" title="Siden findes ikke" description="Linket kan være forkert, eller siden er flyttet." action={<Button href="/">Til forsiden</Button>} />
    </div>
  );
}
