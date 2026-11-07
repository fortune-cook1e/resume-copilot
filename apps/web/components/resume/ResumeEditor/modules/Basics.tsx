'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useResumeStore } from '@/stores/resume-store'
import { contactIcons, getContactIcon } from '@/components/resume/contact-icons'
import { Tag, X, Plus, ArrowUp, Link2, Link2Off } from 'lucide-react'

export default function Basics() {
  const basics = useResumeStore((state) => state.resume?.basics)
  const updateResume = useResumeStore((state) => state.updateResume)
  const [newFieldIndex, setNewFieldIndex] = useState<number | null>(null)
  const [iconPickerIndex, setIconPickerIndex] = useState<number | null>(null)
  const [linkEditorIndex, setLinkEditorIndex] = useState<number | null>(null)
  const [iconSearch, setIconSearch] = useState('')

  if (!basics) return null

  const closeFieldPopovers = () => {
    setIconPickerIndex(null)
    setLinkEditorIndex(null)
  }

  const addCustomField = () => {
    closeFieldPopovers()
    setNewFieldIndex(basics.customFields.length)
    updateResume((draft) => {
      draft.basics.customFields.push({ icon: 'Link', label: '', link: '' })
    })
  }

  const removeCustomField = (index: number) => {
    closeFieldPopovers()
    setNewFieldIndex(null)
    updateResume((draft) => {
      draft.basics.customFields.splice(index, 1)
    })
  }

  const moveCustomFieldUp = (index: number) => {
    if (index === 0) return
    closeFieldPopovers()
    setNewFieldIndex(null)
    updateResume((draft) => {
      const [field] = draft.basics.customFields.splice(index, 1)
      draft.basics.customFields.splice(index - 1, 0, field)
    })
  }

  const updateCustomField = (index: number, field: 'icon' | 'label' | 'link', value: string) => {
    updateResume((draft) => {
      draft.basics.customFields[index][field] = value
    })
  }

  const filteredIcons = contactIcons.filter((icon) =>
    icon.name.toLowerCase().includes(iconSearch.trim().toLowerCase()),
  )

  return (
    <div className="space-y-3 [&_label]:text-xs [&_input]:h-9 [&_input]:bg-background">
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
          onChange={(e) =>
            updateResume((draft) => {
              draft.basics.name = e.target.value
            })
          }
          placeholder="John Doe"
        />
      </div>
      {/* Headline */}
      <div className="space-y-2">
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          value={basics.headline}
          onChange={(e) =>
            updateResume((draft) => {
              draft.basics.headline = e.target.value
            })
          }
          placeholder="Brief description of your professional background..."
        />
      </div>
      {/* Email and Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={basics.email}
            onChange={(e) =>
              updateResume((draft) => {
                draft.basics.email = e.target.value
              })
            }
            placeholder="john@example.com"
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={basics.phone}
            onChange={(e) =>
              updateResume((draft) => {
                draft.basics.phone = e.target.value
              })
            }
            placeholder="+1 234 567 8900"
          />
        </div>
      </div>
      {/* Website */}
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <div className="relative">
          <Input
            id="website"
            type="url"
            value={basics.website.link}
            onChange={(e) =>
              updateResume((draft) => {
                draft.basics.website.link = e.target.value
              })
            }
            placeholder="https://example.com"
            className="pr-10"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Edit website label"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <Tag className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-w-[calc(100vw-2rem)]" align="end">
              <div className="space-y-2">
                <Label htmlFor="website-label">Website Label</Label>
                <Input
                  id="website-label"
                  placeholder="Label (e.g., Portfolio)"
                  value={basics.website.label}
                  onChange={(e) =>
                    updateResume((draft) => {
                      draft.basics.website.label = e.target.value
                    })
                  }
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={basics.location}
          onChange={(e) =>
            updateResume((draft) => {
              draft.basics.location = e.target.value
            })
          }
          placeholder="San Francisco, CA"
        />
      </div>
      {/* Custom Fields */}
      {basics.customFields.map((field, index) => {
        const Icon = getContactIcon(field.icon)
        const number = index + 1
        return (
          <div key={index} className="flex min-w-0 items-center gap-1.5">
            <Popover
              open={iconPickerIndex === index}
              onOpenChange={(open) => {
                setIconPickerIndex(open ? index : null)
                if (open) setIconSearch('')
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Choose icon for field ${number}`}
                  title="Choose icon"
                  className="size-9 text-muted-foreground"
                >
                  <Icon className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                aria-label="Choose field icon"
                className="w-72 max-w-[calc(100vw-2rem)] space-y-2 p-2"
              >
                <Input
                  aria-label="Search for an icon"
                  placeholder="Search for an icon"
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                />
                <div className="grid grid-cols-5 gap-1">
                  {filteredIcons.map(({ name, component: OptionIcon }) => (
                    <Button
                      key={name}
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${name} icon`}
                      aria-pressed={field.icon === name}
                      title={name}
                      className="size-9 justify-self-center aria-pressed:bg-accent"
                      onClick={() => {
                        updateCustomField(index, 'icon', name)
                        setIconPickerIndex(null)
                      }}
                    >
                      <OptionIcon className="size-4" />
                    </Button>
                  ))}
                </div>
                {filteredIcons.length === 0 && (
                  <p className="p-2 text-xs text-muted-foreground" role="status">
                    No icons found
                  </p>
                )}
              </PopoverContent>
            </Popover>
            <Input
              aria-label={`Field ${number} text`}
              autoFocus={index === newFieldIndex}
              placeholder="Field text"
              value={field.label}
              onChange={(e) => updateCustomField(index, 'label', e.target.value)}
              className="min-w-0 flex-1"
            />
            <Popover
              open={linkEditorIndex === index}
              onOpenChange={(open) => setLinkEditorIndex(open ? index : null)}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit link for field ${number}`}
                  title="Edit link"
                  className="size-8 text-muted-foreground"
                >
                  {field.link.trim() ? (
                    <Link2 className="size-4" />
                  ) : (
                    <Link2Off className="size-4" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                aria-label={`Link for field ${number}`}
                className="w-72 max-w-[calc(100vw-2rem)] space-y-2"
              >
                <Label htmlFor={`custom-field-url-${index}`}>Link URL</Label>
                <Input
                  id={`custom-field-url-${index}`}
                  aria-label={`Field ${number} URL`}
                  type="url"
                  placeholder="https://example.com"
                  value={field.link}
                  onChange={(e) => updateCustomField(index, 'link', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Leave empty to display plain text.</p>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Move field ${number} up`}
              title="Move up"
              disabled={index === 0}
              onClick={() => moveCustomFieldUp(index)}
              className="size-8 text-muted-foreground"
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove field ${number}`}
              title="Remove field"
              onClick={() => removeCustomField(index)}
              className="size-8 text-muted-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
        )
      })}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addCustomField}
        className="h-8 w-fit justify-start gap-1.5 px-2 text-xs font-medium text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
      >
        <Plus className="size-3.5" />
        Add field
      </Button>
    </div>
  )
}
