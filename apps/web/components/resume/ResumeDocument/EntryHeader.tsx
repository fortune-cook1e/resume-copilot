export default function EntryHeader({
  title,
  subtitle,
  date,
  location,
  inline = false,
}: {
  title: string
  subtitle?: string
  date?: string
  location?: string
  inline?: boolean
}) {
  if (inline)
    return (
      <div className="resume-inline-header flex gap-3">
        <div className="min-w-0 flex-1">
          {subtitle && <div className="font-semibold">{subtitle}</div>}
          {location && <div className="text-neutral-700">{location}</div>}
        </div>
        <div className="min-w-0 flex-1 font-semibold">{title}</div>
        {date && <div className="min-w-0 flex-1 text-right text-neutral-700">{date}</div>}
      </div>
    )
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
