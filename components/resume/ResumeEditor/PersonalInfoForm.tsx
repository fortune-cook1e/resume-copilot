'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

export default function PersonalInfoForm() {
  const { resume, updateResume } = useResumeStore();

  if (!resume) return null;

  const { personalInfo } = resume;

  const addCustomField = () => {
    updateResume(draft => {
      draft.personalInfo.customFields.push({
        icon: 'Link',
        label: '',
        link: '',
      });
    });
  };

  const removeCustomField = (index: number) => {
    updateResume(draft => {
      draft.personalInfo.customFields.splice(index, 1);
    });
  };

  const updateCustomField = (index: number, field: 'icon' | 'label' | 'link', value: string) => {
    updateResume(draft => {
      draft.personalInfo.customFields[index][field] = value;
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
      <div className="space-y-2">
        <Label htmlFor="picture-url">Picture</Label>
        <div className="flex items-center gap-4">
          {personalInfo.picture.url && (
            <img
              src={personalInfo.picture.url}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover"
            />
          )}
          <Input
            id="picture-url"
            type="url"
            value={personalInfo.picture.url}
            onChange={e =>
              updateResume(draft => {
                draft.personalInfo.picture.url = e.target.value;
              })
            }
            placeholder="https://example.com/avatar.jpg"
            className="flex-1"
          />
        </div>
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={personalInfo.name}
          onChange={e =>
            updateResume(draft => {
              draft.personalInfo.name = e.target.value;
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
          value={personalInfo.headline}
          onChange={e =>
            updateResume(draft => {
              draft.personalInfo.headline = e.target.value;
            })
          }
          placeholder="Brief description of your professional background..."
          rows={3}
        />
      </div>

      {/* Email and Website */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={personalInfo.email}
            onChange={e =>
              updateResume(draft => {
                draft.personalInfo.email = e.target.value;
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
              value={personalInfo.website.link}
              onChange={e =>
                updateResume(draft => {
                  draft.personalInfo.website.link = e.target.value;
                })
              }
              placeholder="https://example.com"
              className="pr-10"
            />
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                >
                  <Tag className="h-4 w-4 text-gray-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                  <Label htmlFor="website-label">Website Label</Label>
                  <Input
                    id="website-label"
                    placeholder="Label (e.g., Portfolio)"
                    value={personalInfo.website.label}
                    onChange={e =>
                      updateResume(draft => {
                        draft.personalInfo.website.label = e.target.value;
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={personalInfo.phone}
            onChange={e =>
              updateResume(draft => {
                draft.personalInfo.phone = e.target.value;
              })
            }
            placeholder="+1 234 567 8900"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={personalInfo.location}
            onChange={e =>
              updateResume(draft => {
                draft.personalInfo.location = e.target.value;
              })
            }
            placeholder="San Francisco, CA"
          />
        </div>
      </div>

      {/* Custom Fields */}
      {personalInfo.customFields.map((field, index) => {
        const IconComponent = commonIcons.find(i => i.name === field.icon)?.component || LinkIcon;

        return (
          <div key={index} className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10">
              <IconComponent className="h-5 w-5 text-gray-500" />
            </div>
            <select
              value={field.icon}
              onChange={e => updateCustomField(index, 'icon', e.target.value)}
              className="w-32 border rounded-md px-3 py-2 text-sm"
            >
              {commonIcons.map(icon => (
                <option key={icon.name} value={icon.name}>
                  {icon.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Label (e.g., Github)"
              value={field.label}
              onChange={e => updateCustomField(index, 'label', e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="https://example.com"
              value={field.link}
              onChange={e => updateCustomField(index, 'link', e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeCustomField(index)}
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
