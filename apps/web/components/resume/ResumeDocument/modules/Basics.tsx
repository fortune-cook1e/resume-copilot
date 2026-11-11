import { useResumeStore } from '@/stores/resume-store'
import Image from 'next/image'
import PreviewBlock from '../PreviewBlock'
import { Mail, Phone as PhoneIcon, MapPin, Link as LinkIcon } from 'lucide-react'
import { getContactIcon } from '@/components/resume/contact-icons'

const Basics = () => {
  const { resume, avatar } = useResumeStore()

  if (!resume) return null

  const {
    basics: { name, headline, location, phone, email, website, customFields },
  } = resume

  const template = resume.design?.template ?? 'onyx'
  const photo = avatar && (
    <Image
      src={avatar}
      alt="Resume photo"
      width={107}
      height={107}
      unoptimized
      data-resume-avatar
      className="h-[80pt] w-[80pt] shrink-0 object-cover"
    />
  )

  return (
    <PreviewBlock sectionId="basics" label="basics" className="resume-basics">
      <div className={photo ? 'resume-basics-with-photo flex gap-[10pt]' : undefined}>
        {(template === 'onyx' || template === 'kakuna') && photo}
        <div className="resume-identity min-w-0 space-y-1.5">
          <div>
            <div data-resume-heading="name" className="font-bold">
              {name}
            </div>
            {name && resume.design?.template === 'scizor' && (
              <hr className="resume-name-rule" data-resume-name-rule />
            )}
            <div className="text-neutral-800">{headline}</div>
          </div>

          <div className="resume-contacts flex flex-wrap items-center gap-x-3 gap-y-1 text-neutral-800">
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
        {(template === 'meowth' || template === 'scizor') && photo}
      </div>
    </PreviewBlock>
  )
}

export default Basics
