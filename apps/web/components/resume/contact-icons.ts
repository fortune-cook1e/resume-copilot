import {
  Github,
  Linkedin,
  Twitter,
  Youtube,
  Instagram,
  Mail,
  Phone,
  MapPin,
  Globe,
  Link,
} from 'lucide-react'

// The editor and shared preview/print document must resolve saved icon names identically.
export const contactIcons = [
  { name: 'Link', component: Link },
  { name: 'Github', component: Github },
  { name: 'Linkedin', component: Linkedin },
  { name: 'Twitter', component: Twitter },
  { name: 'Youtube', component: Youtube },
  { name: 'Instagram', component: Instagram },
  { name: 'Mail', component: Mail },
  { name: 'Phone', component: Phone },
  { name: 'MapPin', component: MapPin },
  { name: 'Globe', component: Globe },
]

export function getContactIcon(name: string) {
  return contactIcons.find((icon) => icon.name === name)?.component ?? Link
}
