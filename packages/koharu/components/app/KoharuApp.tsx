'use client'

import { useEffect, useEffectEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { TitleBar } from '@/components/app/TitleBar'
import { Editor } from '@/components/editor/Editor'
import { SettingsPage } from '@/components/preferences/SettingsPage'
import { StartView } from '@/components/start/StartView'
import { useProject } from '@/lib/queries'
import { useKoharuStore } from '@/lib/store'
import { cn } from '@koharu/ui/lib/utils'

export function KoharuApp() {
  const { t } = useTranslation()
  const project = useProject().data
  const settingsOpen = useKoharuStore((state) => state.settingsOpen)
  const editorOpen = project !== undefined && project !== null && !settingsOpen
  const projectName = project?.name
  const seedSelection = useEffectEvent(() => {
    const store = useKoharuStore.getState()
    store.selectPages(project?.active_page ? [project.active_page] : [])
    store.selectLayers([])
  })

  // A project opens with its active page checked. After that the checked pages
  // are the user's, and emptying them must not bring the active page back.
  useEffect(() => {
    if (projectName !== undefined) seedSelection()
  }, [projectName])

  return (
    <div
      className={cn(
        'relative flex h-screen w-screen flex-col overflow-hidden text-foreground',
        editorOpen ? 'bg-transparent' : 'bg-[var(--surface-titlebar)]',
      )}
    >
      <TitleBar />
      {settingsOpen ? (
        <SettingsPage />
      ) : project === undefined ? (
        <main className='grid min-h-0 flex-1 place-items-center bg-[var(--surface-canvas)]'>
          <div className='flex items-center gap-3 text-[12px] text-muted-foreground'>
            <span className='size-2 rounded-full bg-primary' />
            {t('startup.opening')}
          </div>
        </main>
      ) : project === null ? (
        <StartView />
      ) : (
        <Editor />
      )}
    </div>
  )
}
