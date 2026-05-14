import {
  ApartmentIcon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  DashboardSpeed01Icon,
  LinkSquare02Icon,
  LogoutSquare01Icon,
  Settings01Icon,
  UserCircle02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TeamProjectReference } from '../lib/adoTypes'
import { writeStoredProjectId } from '../lib/selectedProjectStorage'

/** Palette / spacing aligned with account menu reference (neutral grays, inset hover). */
const popoverSurface =
  'rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]'
const popoverInset = 'p-2'
const divider = 'h-px bg-[#EEEEEE]'
const textPrimary = 'text-[#1A1A1A]'
const textMuted = 'text-[#737373]'
const rowHover = 'rounded-lg hover:bg-[#F5F5F5]'
const rowPad = 'gap-3 px-3 py-2.5'
const iconPrimary = 'text-[#1A1A1A]'
const iconMuted = 'text-[#737373]'

type Props = {
  organization: string | undefined
  projects: TeamProjectReference[]
  projectsLoading: boolean
  projectsError: Error | null
  projectId: string | null
  projectName: string | null
  setProject: (id: string, name: string) => void
  onSignOut: () => void
  signOutPending: boolean
}

export function SidenavAccountMenu({
  organization,
  projects,
  projectsLoading,
  projectsError,
  projectId,
  projectName,
  setProject,
  onSignOut,
  signOutPending,
}: Props) {
  const [open, setOpen] = useState(false)
  const [projectsPanelOpen, setProjectsPanelOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) setProjectsPanelOpen(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent) => {
      const el = rootRef.current
      if (!el || el.contains(e.target as Node)) return
      close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  const adoOrgUrl = organization
    ? `https://dev.azure.com/${encodeURIComponent(organization)}`
    : null

  return (
    <div
      ref={rootRef}
      className="app-region-no-drag relative shrink-0 border-t border-[#EEEEEE] bg-[#E5E5E5] px-1.5 pb-2 pt-1"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex w-full items-center ${rowPad} text-left text-sm font-medium ${textPrimary} ${rowHover}`}
        onClick={() => setOpen((v) => !v)}
      >
        <HugeiconsIcon
          icon={Settings01Icon}
          size={16}
          strokeWidth={1.5}
          className={`shrink-0 ${iconPrimary}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate">Settings</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Account and workspace"
          className={`absolute bottom-full left-2 right-2 z-30 mb-1 overflow-hidden ${popoverSurface}`}
        >
          <div className={popoverInset}>
            <div className={`flex items-center ${rowPad} pb-1 pt-0.5`}>
              <HugeiconsIcon
                icon={UserCircle02Icon}
                size={20}
                strokeWidth={1.5}
                className={`shrink-0 ${iconMuted}`}
                aria-hidden
              />
              <span className={`min-w-0 truncate text-xs font-medium ${textMuted}`}>
                {organization ?? 'Not connected'}
              </span>
            </div>

            <div className={`${divider} my-1`} />

            <div>
              <button
                type="button"
                aria-expanded={projectsPanelOpen}
                className={`flex w-full items-center ${rowPad} text-left ${rowHover} ${textPrimary}`}
                onClick={() => setProjectsPanelOpen((v) => !v)}
              >
                <HugeiconsIcon
                  icon={DashboardSpeed01Icon}
                  size={18}
                  strokeWidth={1.5}
                  className={`shrink-0 ${iconPrimary}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium">Project</span>
                  {projectName ? (
                    <span className={`mt-0.5 block truncate text-[10px] font-normal ${textMuted}`}>
                      {projectName}
                    </span>
                  ) : null}
                </span>
                <HugeiconsIcon
                  icon={projectsPanelOpen ? ArrowDown01Icon : ArrowRight01Icon}
                  size={16}
                  strokeWidth={1.5}
                  className={`shrink-0 ${iconMuted} transition-transform duration-150`}
                  aria-hidden
                />
              </button>

              {projectsPanelOpen ? (
                <div className="mt-1 border-t border-[#EEEEEE] pt-2">
                  {projectsLoading ? (
                    <p className={`px-3 py-2 text-xs ${textMuted}`}>Loading projects…</p>
                  ) : projectsError ? (
                    <p className="px-3 py-2 text-xs text-red-600">{projectsError.message}</p>
                  ) : projects.length === 0 ? (
                    <p className={`px-3 py-2 text-xs ${textMuted}`}>No projects found.</p>
                  ) : (
                    <ul
                      className="max-h-48 space-y-0.5 overflow-y-auto overscroll-contain py-0.5"
                      role="listbox"
                      aria-label="Projects"
                    >
                      {projects.map((p) => {
                        const selected = p.id === projectId
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={selected}
                              className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-xs ${
                                selected
                                  ? `bg-[#EBEBEB] font-medium ${textPrimary} hover:bg-[#E5E5E5]`
                                  : `${textPrimary} ${rowHover}`
                              }`}
                              onClick={() => {
                                setProject(p.id, p.name)
                                writeStoredProjectId(organization, p.id)
                                setProjectsPanelOpen(false)
                              }}
                            >
                              <span className="min-w-0 flex-1 truncate">{p.name}</span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

            {adoOrgUrl ? (
              <>
                <div className={`${divider} my-1`} />
                <a
                  href={`${adoOrgUrl}/_settings/organization`}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center ${rowPad} text-xs font-medium ${textPrimary} ${rowHover}`}
                  onClick={() => close()}
                >
                  <HugeiconsIcon
                    icon={ApartmentIcon}
                    size={16}
                    strokeWidth={1.5}
                    className={`shrink-0 ${iconPrimary}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">Organization settings</span>
                  <HugeiconsIcon
                    icon={LinkSquare02Icon}
                    size={14}
                    strokeWidth={1.5}
                    className={`shrink-0 ${iconMuted}`}
                    aria-hidden
                  />
                </a>
              </>
            ) : null}

            <div className={`${divider} my-1`} />

            <button
              type="button"
              className={`flex w-full items-center ${rowPad} text-left text-xs font-medium ${textPrimary} ${rowHover} disabled:opacity-50`}
              onClick={() => {
                close()
                onSignOut()
              }}
              disabled={signOutPending}
            >
              <HugeiconsIcon
                icon={LogoutSquare01Icon}
                size={16}
                strokeWidth={1.5}
                className={`shrink-0 ${iconPrimary}`}
                aria-hidden
              />
              <span>{signOutPending ? 'Signing out…' : 'Log out'}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
