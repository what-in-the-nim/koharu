'use client'

import { useTranslation } from 'react-i18next'

import { usePage } from '@/lib/queries'
import { useKoharuStore } from '@/lib/store'
import { Slider } from '@koharu/ui/components/slider'

interface StatusBarProps {
  onZoomChange: (zoom: number) => void
}

export function StatusBar({ onZoomChange }: StatusBarProps) {
  const { t } = useTranslation()
  const page = usePage().data
  // Selects the displayed percentage so translation-only camera changes do not re-render the bar.
  const zoom = useKoharuStore((state) => Math.round(state.camera.zoom * 100))
  const tool = useKoharuStore((state) => state.tool)
  const compareKey = useKoharuStore((state) => state.shortcuts.compare)

  return (
    <footer className='flex h-7 shrink-0 items-center gap-3 border-t border-border/80 bg-[var(--surface-toolbar)] px-2.5 text-[10px] text-muted-foreground'>
      <div className='flex w-36 shrink-0 items-center gap-2'>
        <Slider
          aria-label={t('status.zoom')}
          min={10}
          max={800}
          step={5}
          value={Math.min(800, Math.max(10, zoom))}
          className='shrink-0 data-horizontal:w-24 [&_[data-slot=slider-thumb]]:size-2'
          onValueChange={(value) => onZoomChange(value / 100)}
        />
        <span className='w-9 shrink-0 text-right text-foreground tabular-nums'>{zoom}%</span>
      </div>
      <span className='min-w-0 flex-1 truncate'>
        {page && t(`status.hints.${tool}`, { compare: compareKey.toUpperCase() })}
      </span>
      {page && (
        <span className='tabular-nums'>
          {page.size.width} × {page.size.height} px
        </span>
      )}
    </footer>
  )
}
