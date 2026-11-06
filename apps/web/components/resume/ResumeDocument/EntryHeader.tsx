export default function EntryHeader({
  title,
  subtitle,
  date,
  location,
}: {
  title: string
  subtitle?: string
  date?: string
  location?: string
}) {
  return (
    <div>
      <div className="flex justify-between gap-3">
        <div className="min-w-0 font-semibold">{title}</div>
        {(location || date) && (
          <div className="text-right text-neutral-700">{location || date}</div>
        )}
      </div>
      {subtitle ? (
        <div className="flex justify-between gap-3">
          <div className="min-w-0">{subtitle}</div>
          {location && date && <div className="text-right text-neutral-700">{date}</div>}
        </div>
      ) : location && date ? (
        <div className="text-right text-neutral-700">{date}</div>
      ) : null}
    </div>
  )
}
