import { useResumeStore } from '@/stores/resume-store';
import Link from './Link';
import {
  Github,
  Linkedin,
  Twitter,
  Youtube,
  Instagram,
  Mail,
  Phone as PhoneIcon,
  MapPin,
  Globe,
  Link as LinkIcon,
} from 'lucide-react';

const Basics = () => {
  const { resume } = useResumeStore();

  if (!resume) return null;

  const {
    basics: { name, headline, location, phone, email, website, picture, customFields },
  } = resume;

  const iconMap: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
    Link: LinkIcon,
    Github: Github,
    Linkedin: Linkedin,
    Twitter: Twitter,
    Youtube: Youtube,
    Instagram: Instagram,
    Mail: Mail,
    Phone: PhoneIcon,
    MapPin: MapPin,
    Globe: Globe,
  };

  return (
    <div className="flex items-start gap-4 border-b border-resume-theme pb-5">
      {/* Avatar */}
      {picture.url && (
        <img
          src={picture.url}
          alt={name}
          className="w-16 h-16 rounded-full object-cover flex-shrink-0"
        />
      )}

      <div className="flex-1 space-y-2">
        <div>
          <div className="text-2xl font-bold text-resume-theme">{name}</div>
          <div className="text-base">{headline}</div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {location && (
            <div className="flex items-center gap-x-1.5">
              <MapPin className="h-4 w-4 text-resume-theme" />
              <div>{location}</div>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-x-1.5">
              <PhoneIcon className="h-4 w-4 text-resume-theme" />
              <a href={`tel:${phone}`} target="_blank" rel="noreferrer">
                {phone}
              </a>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-x-1.5">
              <Mail className="h-4 w-4 text-resume-theme" />
              <a href={`mailto:${email}`} target="_blank" rel="noreferrer">
                {email}
              </a>
            </div>
          )}
          {website.link && (
            <div className="flex items-center gap-x-1.5">
              <LinkIcon className="h-4 w-4 text-resume-theme" />
              <a href={website.link} target="_blank" rel="noreferrer">
                {website.label || 'Website'}
              </a>
            </div>
          )}
          {customFields.map((field, index) => {
            const IconComponent = iconMap[field.icon] || LinkIcon;
            return (
              field.link && (
                <div key={index} className="flex items-center gap-x-1.5">
                  <IconComponent className="h-4 w-4 text-resume-theme" />
                  <a href={field.link} target="_blank" rel="noreferrer">
                    {field.label || field.icon}
                  </a>
                </div>
              )
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Basics;
