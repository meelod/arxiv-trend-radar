type Variant = 'daily' | 'trends' | 'cluster' | 'inline';

const Block = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-stone-200/70 dark:bg-stone-800/70 ${className}`} />
);

const HeaderBlock = () => (
  <div className="space-y-5">
    <div className="flex items-center justify-between gap-3">
      <Block className="h-3 w-40" />
      <Block className="h-8 w-32" />
    </div>
    <Block className="h-10 w-3/4 max-w-[520px]" />
  </div>
);

export function Skeleton({ variant = 'inline' }: { variant?: Variant }) {
  if (variant === 'inline') {
    return (
      <div className="space-y-3" aria-busy="true" aria-live="polite">
        <Block className="h-4 w-32" />
        <Block className="h-4 w-56" />
      </div>
    );
  }

  if (variant === 'daily') {
    return (
      <div className="space-y-10" aria-busy="true" aria-live="polite">
        <HeaderBlock />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 border-y border-stone-200/80 dark:border-stone-800/80 py-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Block className="h-7 w-12" />
              <Block className="h-3 w-16" />
            </div>
          ))}
        </div>
        <Block className="h-20 w-full max-w-[68ch]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card space-y-3">
              <Block className="h-3 w-24" />
              <Block className="h-5 w-5/6" />
              <Block className="h-3 w-full" />
              <Block className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'trends') {
    return (
      <div className="space-y-10" aria-busy="true" aria-live="polite">
        <HeaderBlock />
        <Block className="h-24 w-full max-w-[68ch]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card space-y-3">
              <Block className="h-3 w-16" />
              <Block className="h-3 w-3/4" />
              <Block className="h-3 w-2/3" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card space-y-3">
              <div className="flex items-center justify-between">
                <Block className="h-5 w-1/3" />
                <Block className="h-4 w-16" />
              </div>
              <Block className="h-3 w-full" />
              <Block className="h-3 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // cluster
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <Block className="h-3 w-32" />
      <Block className="h-10 w-2/3" />
      <div className="card space-y-3">
        <Block className="h-3 w-full" />
        <Block className="h-3 w-11/12" />
        <Block className="h-3 w-3/4" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Block key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
