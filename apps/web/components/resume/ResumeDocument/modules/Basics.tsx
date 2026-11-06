import { useResumeStore } from '@/stores/resume-store'
import PreviewBlock from '../PreviewBlock'
import { Mail, Phone as PhoneIcon, MapPin, Link as LinkIcon } from 'lucide-react'
import { getContactIcon } from '@/components/resume/contact-icons'

const Basics = () => {
  const { resume } = useResumeStore()

  if (!resume) return null

  const {
    basics: { name, headline, location, phone, email, website, customFields },
  } = resume

  return (
    <PreviewBlock sectionId="basics" label="basics" className="border-b border-resume-theme pb-3">
      <div className="space-y-1.5">
        <div>
          <div data-resume-heading="name" className="font-bold">
            {name}
          </div>
          <div className="text-neutral-800">{headline}</div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-neutral-800">
          {email && (
            <div className="flex items-center gap-x-1">
              <Mail className="size-3 shrink-0 text-resume-theme" />
              <a href={`mailto:${email}`} target="_blank" rel="noreferrer">
                {email}
              </a>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-x-1">
              <PhoneIcon className="size-3 shrink-0 text-resume-theme" />
              <a href={`tel:${phone}`} target="_blank" rel="noreferrer">
                {phone}
              </a>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-x-1">
              <MapPin className="size-3 shrink-0 text-resume-theme" />
              <div>{location}</div>
            </div>
          )}
          {website.link && (
            <div className="flex items-center gap-x-1">
              <LinkIcon className="size-3 shrink-0 text-resume-theme" />
              <a href={website.link} target="_blank" rel="noreferrer">
                {website.label || 'Website'}
              </a>
            </div>
          )}
          {customFields.map((field, index) => {
            const IconComponent = getContactIcon(field.icon)
            if (!field.label.trim() && !field.link.trim()) return null
            return (
              <div key={index} className="flex items-center gap-x-1">
                <IconComponent className="size-3 shrink-0 text-resume-theme" />
                {field.link.trim() ? (
                  <a href={field.link} target="_blank" rel="noreferrer">
                    {field.label || field.icon}
                  </a>
                ) : (
                  <span>{field.label}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </PreviewBlock>
  )
}

export default Basics
