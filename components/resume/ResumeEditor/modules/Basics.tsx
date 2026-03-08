'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useResumeStore } from '@/stores/resume-store';
import {
  Tag,
  X,
  Plus,
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

export default function Basics() {
  const { resume, updateResume } = useResumeStore();

  if (!resume) return null;

  const { basics } = resume;

  const addCustomField = () => {
    updateResume(draft => {
      draft.basics.customFields.push({
        icon: 'Link',
        label: '',
        link: '',
      });
    });
  };

  const removeCustomField = (index: number) => {
    updateResume(draft => {
      draft.basics.customFields.splice(index, 1);
    });
  };

  const updateCustomField = (index: number, field: 'icon' | 'label' | 'link', value: string) => {
    updateResume(draft => {
      draft.basics.customFields[index][field] = value;
    });
  };

  // 常用图标列表
  const commonIcons = [
    { name: 'Link', component: LinkIcon },
    { name: 'Github', component: Github },
    { name: 'Linkedin', component: Linkedin },
    { name: 'Twitter', component: Twitter },
    { name: 'Youtube', component: Youtube },
    { name: 'Instagram', component: Instagram },
    { name: 'Mail', component: Mail },
    { name: 'Phone', component: PhoneIcon },
    { name: 'MapPin', component: MapPin },
    { name: 'Globe', component: Globe },
  ];

  return (
    <div className="space-y-6">
      {/* Picture */}
      {/* <div className="space-y-2">
        <Label htmlFor="picture-url">Picture</Label>
        <div className="flex items-center gap-4">
          {basics.picture.url && (
            <img
              src={basics.picture.url}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover"
            />
          )}
          <Input
            id="picture-url"
            type="url"
            value={basics.picture.url}
            onChange={e =>
              updateResume(draft => {
                draft.basics.picture.url = e.target.value;
              })
            }
            placeholder="https://example.com/avatar.jpg"
            className="flex-1"
          />
        </div>
      </div> */}

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={basics.name}
          onChange={e =>
            updateResume(draft => {
              draft.basics.name = e.target.value;
            })
          }
          placeholder="John Doe"
        />
      </div>

      {/* Headline */}
      <div className="space-y-2">
        <Label htmlFor="headline">Headline</Label>
        <Textarea
          id="headline"
          value={basics.headline}
          onChange={e =>
            updateResume(draft => {
              draft.basics.headline = e.target.value;
            })
          }
          placeholder="Brief description of your professional background..."
          rows={3}
        />
      </div>

      {/* Email and Website */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={basics.email}
            onChange={e =>
              updateResume(draft => {
                draft.basics.email = e.target.value;
              })
            }
            placeholder="john@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <div className="relative">
            <Input
              id="website"
              type="url"
              value={basics.website.link}
              onChange={e =>
                updateResume(draft => {
                  draft.basics.website.link = e.target.value;
                })
              }
              placeholder="https://example.com"
              className="pr-10"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <Tag className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                  <Label htmlFor="website-label">Website Label</Label>
                  <Input
                    id="website-label"
                    placeholder="Label (e.g., Portfolio)"
                    value={basics.website.label}
                    onChange={e =>
                      updateResume(draft => {
                        draft.basics.website.label = e.target.value;
                      })
                    }
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Phone and Location */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={basics.phone}
            onChange={e =>
              updateResume(draft => {
                draft.basics.phone = e.target.value;
              })
            }
            placeholder="+1 234 567 8900"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={basics.location}
            onChange={e =>
              updateResume(draft => {
                draft.basics.location = e.target.value;
              })
            }
            placeholder="San Francisco, CA"
          />
        </div>
      </div>

      {/* Custom Fields */}
      {basics.customFields.map((field, index) => {
        const IconComponent = commonIcons.find(i => i.name === field.icon)?.component || LinkIcon;

        return (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <IconComponent className="h-5 w-5 text-gray-500" />
            </div>
            <Select
              value={field.icon}
              onValueChange={value => updateCustomField(index, 'icon', value)}
            >
              <SelectTrigger className="w-full min-w-[140px] sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {commonIcons.map(icon => (
                  <SelectItem key={icon.name} value={icon.name}>
                    <icon.component className="h-4 w-4" />
                    {icon.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Label (e.g., Github)"
              value={field.label}
              onChange={e => updateCustomField(index, 'label', e.target.value)}
              className="min-w-[180px] flex-1"
            />
            <Input
              placeholder="https://example.com"
              value={field.link}
              onChange={e => updateCustomField(index, 'link', e.target.value)}
              className="min-w-[220px] flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeCustomField(index)}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      {/* Add Custom Field Button */}
      <Button type="button" variant="outline" onClick={addCustomField} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add a custom field
      </Button>
    </div>
  );
}
