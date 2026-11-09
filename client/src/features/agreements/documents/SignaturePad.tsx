import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { Button } from '@/shared/ui/Button'

export type SignaturePadHandle = { toDataURL: () => string | null; clear: () => void; isEmpty: () => boolean }

/**
 * Draw-to-sign pad (mouse, pen or finger). Exports a transparent PNG data URL.
 * Strokes are kept in CSS pixels and redrawn on resize so nothing is lost when
 * a phone rotates.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, { onChange?: (empty: boolean) => void; label: string }>(
  function SignaturePad({ onChange, label }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const strokes = useRef<{ x: number; y: number }[][]>([])
    const drawing = useRef(false)
    const [empty, setEmpty] = useState(true)

    const redraw = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ratio = window.devicePixelRatio || 1
      const { width, height } = canvas.getBoundingClientRect()
      if (canvas.width !== Math.round(width * ratio)) {
        canvas.width = Math.round(width * ratio)
        canvas.height = Math.round(height * ratio)
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#0b1f3a'
      ctx.lineWidth = 2.4
      for (const s of strokes.current) {
        ctx.beginPath()
        s.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
        if (s.length === 1) ctx.lineTo(s[0].x + 0.1, s[0].y + 0.1)
        ctx.stroke()
      }
    }, [])

    useEffect(() => {
      redraw()
      const ro = new ResizeObserver(redraw)
      if (canvasRef.current) ro.observe(canvasRef.current)
      return () => ro.disconnect()
    }, [redraw])

    const setEmptyState = (v: boolean) => {
      setEmpty(v)
      onChange?.(v)
    }

    const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const r = e.currentTarget.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    useImperativeHandle(ref, () => ({
      isEmpty: () => strokes.current.length === 0,
      clear: () => {
        strokes.current = []
        redraw()
        setEmptyState(true)
      },
      toDataURL: () => {
        const canvas = canvasRef.current
        if (!canvas || strokes.current.length === 0) return null
        return canvas.toDataURL('image/png')
      },
    }))

    return (
      <div>
        <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 focus-within:border-brand-400">
          <canvas
            ref={canvasRef}
            aria-label={label}
            role="img"
            className="block h-44 w-full cursor-crosshair touch-none rounded-xl sm:h-48"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              drawing.current = true
              strokes.current.push([point(e)])
              redraw()
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return
              strokes.current[strokes.current.length - 1].push(point(e))
              redraw()
            }}
            onPointerUp={() => {
              if (drawing.current) setEmptyState(false)
              drawing.current = false
            }}
            onPointerCancel={() => (drawing.current = false)}
          />
          <div className="pointer-events-none absolute inset-x-6 bottom-10 border-b border-slate-300" />
          {empty ? (
            <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-slate-400">Sign above the line</p>
          ) : null}
        </div>
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="ghost" icon={Eraser} disabled={empty} onClick={() => {
            strokes.current = []
            redraw()
            setEmptyState(true)
          }}>
            Clear
          </Button>
        </div>
      </div>
    )
  },
)
