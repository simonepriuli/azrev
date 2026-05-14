import { HugeiconsIcon } from '@hugeicons/react'
import type { PullRequestStatusPresentation } from './pullRequestStatusPresentation'
import { SidebarToggleButton } from './SidebarToggleButton'

type ApplicationHeaderProps = {
  reserveSidebarToggleSpace: boolean
  showSidebarToggle: boolean
  sidebarToggleClassName?: string
  pullRequestId: number
  title: string
  status: PullRequestStatusPresentation
  onToggleSidebar: () => void
}

export function ApplicationHeader({
  reserveSidebarToggleSpace,
  showSidebarToggle,
  sidebarToggleClassName = '',
  pullRequestId,
  title,
  status,
  onToggleSidebar,
}: ApplicationHeaderProps) {
  return (
    <div className="flex min-w-0 items-center">
      <div
        className={`shrink-0 overflow-hidden transition-[width] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          reserveSidebarToggleSpace ? sidebarToggleClassName : 'w-0'
        }`}
      >
        <SidebarToggleButton
          expanded={false}
          tabIndex={showSidebarToggle ? undefined : -1}
          className={`shrink-0 transition-opacity duration-200 ${
            showSidebarToggle ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={onToggleSidebar}
        />
      </div>

      <h2 className="flex min-w-0 items-center gap-2 text-base font-medium text-slate-900">
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 align-middle font-mono ${status.className}`}
          title={`Pull request status: ${status.label}`}
        >
          <HugeiconsIcon
            icon={status.icon}
            size={18}
            strokeWidth={1.7}
            aria-label={`Pull request ${status.label}`}
          />
          !{pullRequestId}
        </span>
        <span className="min-w-0 truncate">{title}</span>
      </h2>
    </div>
  )
}
