'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { InferenceControl } from '@/components/editor/InferenceControl'
import { call } from '@/lib/backend'
import { usePage, usePages } from '@/lib/queries'
import { pipelineStages, useKoharuStore, type PipelineScope } from '@/lib/store'
import { commands, type Scope, type Stage } from '@koharu/bridge/protocol'
import { Button } from '@koharu/ui/components/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@koharu/ui/components/tooltip'

export function CanvasCommandBar() {
  const { t } = useTranslation()
  const page = usePage().data
  const pages = usePages().data ?? []
  const pageIndex = page ? pages.findIndex((candidate) => candidate.id === page.id) : -1
  const requestPageStep = useKoharuStore((state) => state.requestPageStep)
  const selectedPages = useKoharuStore((state) => state.selectedPages)
  const jobs = useKoharuStore((state) => state.jobs)
  const running = Object.values(jobs).find((job) => job.state === 'running')

  const run = (selection: PipelineScope, stages: Stage[]) => {
    if (!page) return
    const scope: Scope =
      selection === 'project'
        ? { scope: 'project' }
        : selection === 'selected-pages'
          ? { scope: 'pages', value: selectedPages }
          : { scope: 'pages', value: [page.id] }
    const operation =
      stages.length === pipelineStages.length
        ? ({ operation: 'full' } as const)
        : stages.length === 1
          ? ({ operation: 'only', stage: stages[0]! } as const)
          : ({ operation: 'stages', stages } as const)
    void call(commands.process, scope, operation).catch(() => undefined)
  }

  return (
    <header className='flex h-10 shrink-0 items-center gap-2 border-b border-border/80 bg-[var(--surface-toolbar)] px-2.5'>
      <div className='flex min-w-0 flex-1 items-center gap-0.5'>
        {pageIndex >= 0 && (
          <>
            <PageStepButton
              label={t('menu.previousPage')}
              shortcut='PgUp'
              disabled={pageIndex === 0}
              onClick={() => requestPageStep(-1)}
            >
              <ChevronLeft className='size-3.5' />
            </PageStepButton>
            <span
              aria-label={t('canvas.pagePosition', { index: pageIndex + 1, count: pages.length })}
              className='min-w-12 text-center text-[11px] text-muted-foreground tabular-nums'
            >
              {pageIndex + 1} / {pages.length}
            </span>
            <PageStepButton
              label={t('menu.nextPage')}
              shortcut='PgDn'
              disabled={pageIndex === pages.length - 1}
              onClick={() => requestPageStep(1)}
            >
              <ChevronRight className='size-3.5' />
            </PageStepButton>
          </>
        )}
      </div>
      <InferenceControl disabled={!page || Boolean(running)} onRun={run} />
    </header>
  )
}

function PageStepButton({
  label,
  shortcut,
  disabled,
  onClick,
  children,
}: {
  label: string
  shortcut: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type='button'
            variant='ghost'
            size='icon-xs'
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side='bottom'>
        {label}
        <span className='ml-2 opacity-60'>{shortcut}</span>
      </TooltipContent>
    </Tooltip>
  )
}
