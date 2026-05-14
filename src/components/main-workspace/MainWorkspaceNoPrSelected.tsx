import { SidebarToggleButton } from './SidebarToggleButton'

type MainWorkspaceNoPrSelectedProps = {
  showMainSidebarToggle: boolean
  isMac: boolean
  onToggleSidebar: () => void
}

export function MainWorkspaceNoPrSelected({
  showMainSidebarToggle,
  isMac,
  onToggleSidebar,
}: MainWorkspaceNoPrSelectedProps) {
  return (
    <div className="app-region-drag flex flex-1 flex-col">
      {showMainSidebarToggle ? (
        <div className="flex h-11 shrink-0 items-center px-5">
          <SidebarToggleButton
            expanded={false}
            className={`transition-opacity duration-200 ${isMac ? 'ml-14' : ''}`}
            onClick={onToggleSidebar}
          />
        </div>
      ) : null}
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="app-region-no-drag text-sm text-slate-500">Select a pull request to review.</p>
      </div>
    </div>
  )
}
