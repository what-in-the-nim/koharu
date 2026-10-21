'use client'

import { useMutationState } from '@tanstack/react-query'
import { ChevronDown, CircleAlert, Download, LoaderCircle, Square, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { call } from '@/lib/backend'
import { usePages } from '@/lib/queries'
import { useKoharuStore } from '@/lib/store'
import { commands, type Download as DownloadState, type Job } from '@koharu/bridge/protocol'
import { Button } from '@koharu/ui/components/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@koharu/ui/components/collapsible'

export function ActivityCenter() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)
  const jobs = useKoharuStore((state) => state.jobs)
  const downloads = useKoharuStore((state) => state.downloads)
  const activities = useMutationState({
    filters: { status: 'pending' },
    select: (mutation) => ({
      id: mutation.mutationId,
      label: mutation.options.meta?.activity,
    }),
  }).filter(
    (activity): activity is { id: number; label: string } => typeof activity.label === 'string',
  )
  const visibleJobs = Object.values(jobs).filter(
    (job) => job.state === 'running' || job.state === 'failed',
  )
  const runningDownloads = Object.values(downloads).filter(
    (download) => download.state === 'running',
  )
  const failedDownloads = Object.values(downloads).filter((download) => download.state === 'failed')
  const visibleDownloads = [...runningDownloads, ...failedDownloads]
  const count = activities.length + visibleJobs.length + visibleDownloads.length
  if (count === 0) return null
  const failed = failedDownloads.length > 0 || visibleJobs.some((job) => job.state === 'failed')
  const busy =
    count > failedDownloads.length + visibleJobs.filter((job) => job.state === 'failed').length

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      render={<aside aria-label={t('activity.title')} />}
      className='absolute right-3 bottom-9 z-30 flex w-72 max-w-[calc(100%-1.5rem)] flex-col rounded-2xl border border-border/50 bg-popover shadow-md'
    >
      <CollapsibleTrigger className='group flex items-center gap-2 rounded-2xl px-3 py-2 text-left outline-none hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-ring/25 data-[panel-open]:rounded-b-none data-[panel-open]:border-b'>
        <span className='text-[10px] font-semibold tracking-[0.1em] uppercase'>
          {t('activity.title')}
        </span>
        <span className='rounded-full bg-primary/[0.07] px-1.5 py-0.5 text-[10px] text-muted-foreground tabular-nums'>
          {count}
        </span>
        {busy && !open ? (
          <LoaderCircle
            className='size-3 animate-spin text-primary motion-reduce:animate-none'
            aria-hidden='true'
          />
        ) : null}
        {failed && !open ? (
          <CircleAlert className='size-3 text-destructive' aria-hidden='true' />
        ) : null}
        <ChevronDown
          className='ml-auto size-3.5 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180 motion-reduce:transition-none'
          aria-hidden='true'
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {activities.map((activity) => (
          <div
            key={activity.id}
            role='status'
            className='grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-2.5 border-b p-3 last:border-b-0'
          >
            <LoaderCircle
              className='size-3.5 animate-spin justify-self-center text-primary motion-reduce:animate-none'
              aria-hidden='true'
            />
            <span className='truncate text-[12px] font-medium'>{t(activity.label)}</span>
          </div>
        ))}
        {runningDownloads.length > 1 ? (
          <DownloadGroup downloads={runningDownloads} />
        ) : (
          runningDownloads.map((download) => <DownloadItem key={download.id} download={download} />)
        )}
        {failedDownloads.map((download) => (
          <DownloadItem key={download.id} download={download} />
        ))}
        {visibleJobs.map((job) => (
          <JobItem key={job.id} job={job} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

function DownloadGroup({ downloads }: { downloads: DownloadState[] }) {
  const { t } = useTranslation()
  const hasKnownTotal = downloads.every((download) => download.total > 0)
  const percent = hasKnownTotal
    ? progress(
        downloads.reduce((sum, download) => sum + download.completed, 0),
        downloads.reduce((sum, download) => sum + download.total, 0),
      )
    : null

  return (
    <div className='border-b p-3 last:border-b-0'>
      <div className='grid grid-cols-[1rem_minmax(0,1fr)_2.25rem_1.5rem] items-start gap-x-2.5'>
        <Download className='mt-0.5 size-3.5 justify-self-center text-primary' />
        <span className='truncate text-[11px]'>
          {t('activity.downloadingFiles', { count: downloads.length })}
        </span>
        <span className='text-right text-[10px] tabular-nums'>
          {percent !== null ? `${percent}%` : null}
        </span>
        <span aria-hidden='true' />
        <div className='col-start-2 col-end-4'>
          <Progress value={percent} />
        </div>
      </div>
    </div>
  )
}

function JobItem({ job }: { job: Job }) {
  const { t } = useTranslation()
  const dismiss = useKoharuStore((state) => state.dismissJob)
  // The pipeline reports which page it is on; the rail has already loaded the
  // labels, so this resolves from cache rather than fetching.
  const pages = usePages(job.page !== null).data
  // Numbered by position in the rail, so the row says where in the run this
  // is as well as which file: a scan filename alone rarely tells you.
  const pageIndex = job.page ? (pages?.findIndex((page) => page.id === job.page) ?? -1) : -1
  const page = pageIndex >= 0 ? pages?.[pageIndex] : undefined
  const pageLabel = page
    ? t('activity.pageLabel', { number: pageIndex + 1, label: page.label })
    : undefined
  if (job.state === 'failed') {
    return (
      <Failure
        title={
          job.stage
            ? t('activity.stageFailed', {
                stage: t(`phase.${job.stage}`, { defaultValue: job.stage }),
              })
            : t('activity.processingFailed')
        }
        details={[pageLabel, job.model]}
        message={job.error}
        onDismiss={() => dismiss(job.id)}
      />
    )
  }
  const percent = progress(job.completed, job.total)
  return (
    <div className='border-b p-3 last:border-b-0'>
      <div className='grid grid-cols-[1rem_minmax(0,1fr)_2.25rem_1.5rem] items-start gap-x-2.5'>
        <span className='mt-1.5 size-1.5 justify-self-center rounded-full bg-primary' />
        <div className='min-w-0'>
          <span className='block truncate text-[12px] font-medium capitalize'>
            {job.stage
              ? t(`phase.${job.stage}`, { defaultValue: job.stage })
              : t('activity.processing')}
          </span>
        </div>
        <span className='pt-0.5 text-right text-[10px] tabular-nums'>
          {percent !== null ? `${percent}%` : null}
        </span>
        <Button
          size='icon-xs'
          variant='ghost'
          className='-mt-1'
          aria-label={t('activity.stop')}
          onClick={() => void call(commands.stopJob, job.id).catch(() => undefined)}
        >
          <Square className='size-2.5 fill-current' />
        </Button>
        {pageLabel ? (
          <p className='col-start-2 col-end-4 mt-0.5 truncate text-[10px] text-muted-foreground'>
            {pageLabel}
          </p>
        ) : null}
        {job.model ? (
          <p className='col-start-2 col-end-4 truncate text-[10px] text-muted-foreground'>
            {job.model}
          </p>
        ) : null}
        <div className='col-start-2 col-end-4'>
          <Progress value={percent} />
        </div>
      </div>
    </div>
  )
}

function DownloadItem({ download }: { download: DownloadState }) {
  const { t } = useTranslation()
  const dismiss = useKoharuStore((state) => state.dismissDownload)
  if (download.state === 'failed') {
    return (
      <Failure
        title={t('activity.downloadFailed')}
        details={[download.name]}
        message={download.error}
        onDismiss={() => dismiss(download.id)}
      />
    )
  }
  const percent = progress(download.completed, download.total)
  return (
    <div className='border-b p-3 last:border-b-0'>
      <div className='grid grid-cols-[1rem_minmax(0,1fr)_2.25rem_1.5rem] items-start gap-x-2.5'>
        <Download className='mt-0.5 size-3.5 justify-self-center text-primary' />
        <span className='truncate text-[11px]'>{download.name || t('activity.modelDownload')}</span>
        <span className='text-right text-[10px] tabular-nums'>
          {percent !== null ? `${percent}%` : null}
        </span>
        <span aria-hidden='true' />
        <div className='col-start-2 col-end-4'>
          <Progress value={percent} />
        </div>
      </div>
    </div>
  )
}

function Failure({
  title,
  details,
  message,
  onDismiss,
}: {
  title: string
  details: (string | null | undefined)[]
  message: string | null
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      role='alert'
      className='grid grid-cols-[1rem_minmax(0,1fr)_2.25rem_1.5rem] items-start gap-x-2.5 border-b p-3 last:border-b-0'
    >
      <CircleAlert className='mt-0.5 size-3.5 justify-self-center text-destructive' />
      <span className='col-start-2 col-end-4 truncate text-[12px] font-medium text-destructive'>
        {title}
      </span>
      <Button
        size='icon-xs'
        variant='ghost'
        className='-mt-1'
        aria-label={t('activity.dismiss')}
        onClick={onDismiss}
      >
        <X />
      </Button>
      {details.filter(Boolean).map((detail) => (
        <p
          key={detail}
          className='col-start-2 col-end-4 mt-0.5 truncate text-[10px] text-muted-foreground'
        >
          {detail}
        </p>
      ))}
      {message ? (
        <p className='col-start-2 col-end-5 mt-1.5 max-h-24 overflow-y-auto text-[11px] leading-4 break-words whitespace-pre-wrap select-text'>
          {message}
        </p>
      ) : null}
    </div>
  )
}

function Progress({ value }: { value: number | null }) {
  return (
    <div
      role='progressbar'
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
      className='mt-2 h-1 overflow-hidden rounded-full bg-muted'
    >
      <div
        className={`h-full rounded-full bg-primary ${value === null ? 'w-1/2' : ''}`}
        style={value === null ? undefined : { width: `${value}%` }}
      />
    </div>
  )
}

function progress(completed: number, total: number): number | null {
  return total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : null
}
