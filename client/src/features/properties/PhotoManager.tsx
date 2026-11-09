import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Images, Pencil, Trash2 } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { ImageOut, UnitOut } from '@/shared/api/types'
import { useAuth } from '@/shared/auth/AuthProvider'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Button } from '@/shared/ui/Button'
import { Dialog, ConfirmDialog } from '@/shared/ui/Dialog'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Field, FormError, Input, Select } from '@/shared/ui/Form'

const INVALIDATE = [['properties'], ['units']]

/**
 * Photos of a property (and its units). `fixedUnitId` restricts the manager
 * to one unit's photos (unit detail page).
 */
export function PhotoManager({
  propertyId,
  images,
  units = [],
  fixedUnitId,
  readOnly,
}: {
  propertyId: number
  images: ImageOut[]
  units?: UnitOut[]
  fixedUnitId?: number
  readOnly?: boolean
}) {
  const { can } = useAuth()
  const manage = can('properties.manage') && !readOnly
  const input = useRef<HTMLInputElement>(null)
  const [target, setTarget] = useState(fixedUnitId ? String(fixedUnitId) : '')
  const [editing, setEditing] = useState<ImageOut | null>(null)
  const [deleting, setDeleting] = useState<ImageOut | null>(null)
  const [caption, setCaption] = useState('')

  const upload = useApiMutation(
    (files: File[]) => {
      const form = new FormData()
      files.forEach((f) => form.append('files', f))
      if (target) form.append('unit_id', target)
      return api.upload<ImageOut[]>(`/properties/${propertyId}/images`, form)
    },
    { success: (r) => `${r.length} photo(s) uploaded`, invalidate: INVALIDATE, toastError: true },
  )
  const update = useApiMutation(
    ({ id, body }: { id: number; body: { caption?: string; sort_order?: number } }) => api.patch<ImageOut>(`/images/${id}`, body),
    { invalidate: INVALIDATE, toastError: true },
  )
  const remove = useApiMutation((id: number) => api.del(`/images/${id}`), {
    success: 'Photo removed',
    invalidate: INVALIDATE,
    onSuccess: () => setDeleting(null),
  })

  const groups: { key: string; label: string; items: ImageOut[] }[] = []
  const shown = fixedUnitId ? images.filter((i) => i.unit_id === fixedUnitId) : images
  for (const img of shown) {
    const key = img.unit_id ? String(img.unit_id) : 'property'
    let g = groups.find((x) => x.key === key)
    if (!g) {
      const u = units.find((x) => x.id === img.unit_id)
      g = { key, label: img.unit_id ? `Unit ${u?.code ?? img.unit_id}` : 'Whole property', items: [] }
      groups.push(g)
    }
    g.items.push(img)
  }
  for (const g of groups) g.items.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)

  async function move(list: ImageOut[], index: number, dir: -1 | 1) {
    const other = list[index + dir]
    const img = list[index]
    if (!other) return
    // Swap positions; normalise when the orders are equal.
    const a = other.sort_order === img.sort_order ? index + dir : other.sort_order
    const b = other.sort_order === img.sort_order ? index : img.sort_order
    await update.mutateAsync({ id: img.id, body: { sort_order: a } })
    await update.mutateAsync({ id: other.id, body: { sort_order: b } })
  }

  return (
    <div className="space-y-5">
      {manage ? (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 sm:flex-row sm:items-end">
          {!fixedUnitId && units.length ? (
            <Field label="Photos of" className="sm:w-72">
              <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Whole property</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    Unit {u.code} · {u.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              if (files.length) upload.mutate(files)
              e.target.value = ''
            }}
          />
          <Button icon={ImagePlus} loading={upload.isPending} onClick={() => input.current?.click()}>
            Upload photos
          </Button>
          <p className="text-sm text-slate-500 sm:ml-2">JPEG, PNG or WebP · up to 20 at a time</p>
        </div>
      ) : null}

      {!groups.length ? (
        <EmptyState icon={Images} title="No photos yet" description={manage ? 'Upload photographs to show this property on the website.' : undefined} />
      ) : (
        groups.map((g) => (
          <div key={g.key}>
            {!fixedUnitId ? <h3 className="mb-2 text-sm font-semibold text-slate-700">{g.label}</h3> : null}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {g.items.map((img, i) => (
                <li key={img.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <a href={img.url} target="_blank" rel="noreferrer" className="block aspect-[4/3] bg-slate-100">
                    <img src={img.thumb_url} alt={img.caption || 'Property photo'} loading="lazy" className="size-full object-cover" />
                  </a>
                  <div className="flex items-center gap-1 p-1.5">
                    <p className="min-w-0 flex-1 truncate px-1 text-xs text-slate-600">{img.caption || (i === 0 ? 'Cover photo' : ' ')}</p>
                    {manage ? (
                      <>
                        <button type="button" aria-label="Move earlier" disabled={i === 0} onClick={() => move(g.items, i, -1)} className="inline-flex size-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                          <ArrowUp className="size-4" />
                        </button>
                        <button type="button" aria-label="Move later" disabled={i === g.items.length - 1} onClick={() => move(g.items, i, 1)} className="inline-flex size-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                          <ArrowDown className="size-4" />
                        </button>
                        <button type="button" aria-label="Edit caption" onClick={() => { setEditing(img); setCaption(img.caption) }} className="inline-flex size-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
                          <Pencil className="size-4" />
                        </button>
                        <button type="button" aria-label="Delete photo" onClick={() => setDeleting(img)} className="inline-flex size-9 items-center justify-center rounded-md text-red-600 hover:bg-red-50">
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        size="sm"
        title="Photo caption"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)} block className="sm:w-auto">
              Cancel
            </Button>
            <Button
              loading={update.isPending}
              block
              className="sm:w-auto"
              onClick={async () => {
                await update.mutateAsync({ id: editing!.id, body: { caption: caption.trim() } })
                setEditing(null)
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Field label="Caption">
          <Input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={255} placeholder="Living room, view from balcony…" />
        </Field>
        <div className="mt-3">
          <FormError message={update.errorText} />
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting!.id)}
        title="Delete this photo?"
        description="The photograph is removed from the property and the website."
        confirmLabel="Delete"
        tone="danger"
        loading={remove.isPending}
        error={remove.errorText}
      />
    </div>
  )
}
