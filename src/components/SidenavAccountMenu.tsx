import {
  ApartmentIcon,
  ArrowRight01Icon,
  LinkSquare02Icon,
  LogoutSquare01Icon,
  Settings01Icon,
  ThirdBracketSquareIcon,
  Tick01Icon,
  UserCircle02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TeamProjectReference } from '../lib/adoTypes'
import { writeStoredProjectId } from '../lib/selectedProjectStorage'

/** Palette / spacing aligned with account menu reference (neutral grays, inset hover). */
const popoverSurface =
  'rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]'
/** 8px padding at panel edges; 8px vertical gap between each block (incl. dividers) */
const popoverContent = 'flex flex-col gap-2 px-2 pb-2 pt-2'
const divider = 'h-px w-full shrink-0 bg-[#EEEEEE]'
const textPrimary = 'text-[#1A1A1A]'
const textMuted = 'text-[#737373]'
/** Popover header org label — same weight as rows, lighter color so it reads as non-action */
const textHeaderLabel = 'text-[#A9A9AA]'
const rowHover = 'rounded-lg hover:bg-slate-900/5'
/** Fixed 32px row height for popover menu items */
const panelRow = 'flex h-8 min-h-8 max-h-8 w-full shrink-0 items-center gap-3 px-3'
const panelRowInteractive = `${panelRow} rounded-lg text-xs font-medium ${textPrimary} ${rowHover}`
const iconPrimary = 'text-[#1A1A1A]'
const iconMuted = 'text-[#737373]'

type Props = {
  organization: string | undefined
  projects: TeamProjectReference[]
  projectsLoading: boolean
  projectsError: Error | null
  projectId: string | null
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
      className="app-region-no-drag sidenav-footer relative shrink-0 bg-transparent px-1.5 pb-2 pt-1"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex h-8 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium ${textPrimary} ${rowHover}`}
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
          <div className={popoverContent}>
            <div className={`${panelRow} text-xs font-medium ${textHeaderLabel}`}>
              <HugeiconsIcon
                icon={UserCircle02Icon}
                size={16}
                strokeWidth={1.5}
                className={`shrink-0 ${textHeaderLabel}`}
                aria-hidden
              />
              <span className="min-w-0 truncate">{organization ?? 'Not connected'}</span>
            </div>

            <div className={divider} role="separator" />

            <div>
              <button
                type="button"
                aria-expanded={projectsPanelOpen}
                className={`${panelRowInteractive} text-left`}
                onClick={() => setProjectsPanelOpen((v) => !v)}
              >
                <HugeiconsIcon
                  icon={ThirdBracketSquareIcon}
                  size={16}
                  strokeWidth={1.5}
                  className={`shrink-0 ${iconPrimary}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">Project</span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  strokeWidth={1.5}
                  className={`shrink-0 ${iconMuted} transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${
                    projectsPanelOpen ? 'rotate-90' : ''
                  }`}
                  aria-hidden
                />
              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${
                  projectsPanelOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div
                  className={`min-h-0 overflow-hidden ${projectsPanelOpen ? '' : 'pointer-events-none'}`}
                  aria-hidden={!projectsPanelOpen}
                >
                  {projectsLoading ? (
                    <p className={`${panelRow} text-xs ${textMuted}`}>Loading projects…</p>
                  ) : projectsError ? (
                    <p className={`${panelRow} truncate text-xs text-red-600`} title={projectsError.message}>
                      {projectsError.message}
                    </p>
                  ) : projects.length === 0 ? (
                    <p className={`${panelRow} text-xs ${textMuted}`}>No projects found.</p>
                  ) : (
                    <ul
                      className="max-h-48 overflow-y-auto overscroll-contain py-0"
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
                              tabIndex={projectsPanelOpen ? undefined : -1}
                              className={`${panelRow} rounded-lg text-left text-xs font-normal ${textPrimary} ${rowHover}`}
                              onClick={() => {
                                setProject(p.id, p.name)
                                writeStoredProjectId(organization, p.id)
                                setProjectsPanelOpen(false)
                              }}
                            >
                              <span className="min-w-0 flex-1 truncate">{p.name}</span>
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                                {selected ? (
                                  <HugeiconsIcon
                                    icon={Tick01Icon}
                                    size={14}
                                    strokeWidth={1.75}
                                    className={iconPrimary}
                                    aria-hidden
                                  />
                                ) : null}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className={divider} role="separator" />

            {adoOrgUrl ? (
              <div className="flex flex-col gap-1">
                <a
                  href={`${adoOrgUrl}/_settings/organization`}
                  target="_blank"
                  rel="noreferrer"
                  className={panelRowInteractive}
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
                <button
                  type="button"
                  className={`${panelRowInteractive} text-left disabled:opacity-50`}
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
            ) : (
              <button
                type="button"
                className={`${panelRowInteractive} text-left disabled:opacity-50`}
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
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
