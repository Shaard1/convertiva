type SectionHeadingProps = {
  badge?: string;
  title: string;
  description: string;
  center?: boolean;
};

export function SectionHeading({
  badge,
  title,
  description,
  center = true,
}: SectionHeadingProps) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {badge ? (
        <span className="eyebrow mb-4">
          {badge}
        </span>
      ) : null}
      <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
        {description}
      </p>
    </div>
  );
}
