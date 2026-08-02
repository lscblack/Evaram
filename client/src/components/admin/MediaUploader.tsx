import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ImagePlus, Loader2, Star, Trash2, Upload } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ApiMedia } from '@/types/api'

export interface StagedFile {
  id: string
  file: File
  preview: string
  error?: string
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif'
const MAX_MB = 25

/** A stable identity — a fresh `[]` default would re-run the sync effect forever. */
const NO_MEDIA: ApiMedia[] = []

/**
 * Drag-and-drop image manager for a listing.
 *
 * Works in two modes. Before the property exists, files are *staged* in the
 * browser with local previews and handed back to the caller to upload once it
 * has an id. Given a `propertyId`, uploads go straight up and the component
 * shows what is already stored.
 */
export function MediaUploader({
  propertyId,
  staged,
  onStagedChange,
  existing = NO_MEDIA,
  onUploaded,
}: {
  propertyId?: string
  staged?: StagedFile[]
  onStagedChange?: (next: StagedFile[]) => void
  existing?: ApiMedia[]
  onUploaded?: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ApiMedia[]>(existing)

  // Sync only when the stored set actually differs, not on every new array
  // identity the parent happens to create.
  const existingKey = existing.map((m) => `${m.id}:${m.is_cover}`).join('|')
  useEffect(() => {
    setItems(existing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingKey])

  // Object URLs are a leak if they outlive their preview.
  useEffect(() => {
    return () => {
      for (const item of staged ?? []) URL.revokeObjectURL(item.preview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const accept = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      setError(null)

      const incoming: StagedFile[] = []
      for (const file of Array.from(fileList)) {
        if (!ACCEPT.split(',').includes(file.type)) {
          setError(`${file.name} is not an image we accept.`)
          continue
        }
        if (file.size > MAX_MB * 1024 * 1024) {
          setError(`${file.name} is over ${MAX_MB} MB.`)
          continue
        }
        incoming.push({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          file,
          preview: URL.createObjectURL(file),
        })
      }
      if (incoming.length === 0) return

      if (!propertyId) {
        onStagedChange?.([...(staged ?? []), ...incoming])
        return
      }

      setBusy(true)
      try {
        await api.upload<ApiMedia[]>(
          `/admin/properties/${propertyId}/media/upload`,
          incoming.map((i) => i.file),
          { kind: 'image' },
        )
        for (const item of incoming) URL.revokeObjectURL(item.preview)
        onUploaded?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Those files did not upload.')
      } finally {
        setBusy(false)
      }
    },
    [propertyId, staged, onStagedChange, onUploaded],
  )

  const removeStaged = (id: string) => {
    const target = (staged ?? []).find((s) => s.id === id)
    if (target) URL.revokeObjectURL(target.preview)
    onStagedChange?.((staged ?? []).filter((s) => s.id !== id))
  }

  const removeStored = async (id: string) => {
    if (!window.confirm('Remove this image?')) return
    setBusy(true)
    try {
      await api.delete(`/admin/properties/media/${id}`)
      setItems((prev) => prev.filter((m) => m.id !== id))
      onUploaded?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That image was not removed.')
    } finally {
      setBusy(false)
    }
  }

  const makeCover = async (id: string) => {
    if (!propertyId) return
    setBusy(true)
    try {
      await api.post(
        `/admin/properties/${propertyId}/media/reorder?cover_id=${id}`,
        items.map((m) => m.id),
      )
      setItems((prev) => prev.map((m) => ({ ...m, is_cover: m.id === id })))
      onUploaded?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The cover was not changed.')
    } finally {
      setBusy(false)
    }
  }

  const tiles = [
    ...items.map((m) => ({ key: m.id, src: m.url, cover: m.is_cover, stored: true, id: m.id })),
    ...(staged ?? []).map((s) => ({
      key: s.id,
      src: s.preview,
      cover: false,
      stored: false,
      id: s.id,
    })),
  ]

  return (
    <div className="space-y-3">
      {/* ---- drop zone ---- */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void accept(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-colors',
          dragging
            ? 'border-gold-500 bg-gold-50'
            : 'border-line hover:border-line-strong hover:bg-canvas-alt',
        )}
      >
        {busy ? (
          <Loader2 className="size-6 animate-spin text-gold-600" strokeWidth={2.2} />
        ) : (
          <ImagePlus className="size-6 text-ink-faint" strokeWidth={2} />
        )}
        <p className="mt-2.5 text-[0.875rem] font-semibold text-ink">
          {busy ? 'Uploading…' : 'Drop images here, or click to choose'}
        </p>
        <p className="mt-1 text-[0.75rem] text-ink-muted">
          JPEG, PNG, WebP or AVIF · up to {MAX_MB} MB each · the first image becomes the cover
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            void accept(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[0.8125rem] text-amber-800">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} />
          {error}
        </p>
      )}

      {/* ---- what we have ---- */}
      {tiles.length > 0 && (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {tiles.map((tile, index) => (
            <li key={tile.key} className="group relative overflow-hidden rounded-xl border border-line">
              <img
                src={tile.src}
                alt=""
                aria-hidden
                className="aspect-4/3 w-full bg-canvas-alt object-cover"
              />

              {(tile.cover || (!items.length && index === 0)) && (
                <span className="absolute top-1.5 left-1.5 rounded-md bg-gold-500 px-1.5 py-0.5 text-[0.625rem] font-bold text-white">
                  COVER
                </span>
              )}
              {!tile.stored && (
                <span className="absolute top-1.5 right-1.5 rounded-md bg-ink/80 px-1.5 py-0.5 text-[0.625rem] font-bold text-canvas">
                  PENDING
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-navy-950/80 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                {tile.stored && !tile.cover && (
                  <button
                    type="button"
                    onClick={() => void makeCover(tile.id)}
                    aria-label="Make cover"
                    className="grid size-7 place-items-center rounded-md bg-white/90 text-navy-900 hover:bg-white"
                  >
                    <Star className="size-3.5" strokeWidth={2.4} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    tile.stored ? void removeStored(tile.id) : removeStaged(tile.id)
                  }
                  aria-label="Remove"
                  className="grid size-7 place-items-center rounded-md bg-white/90 text-red-600 hover:bg-white"
                >
                  <Trash2 className="size-3.5" strokeWidth={2.4} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(staged?.length ?? 0) > 0 && !propertyId && (
        <p className="flex items-center gap-2 text-[0.75rem] text-ink-muted">
          <Upload className="size-3.5" strokeWidth={2.2} />
          {staged?.length} image{staged?.length === 1 ? '' : 's'} will upload when you save the
          listing.
        </p>
      )}
    </div>
  )
}
