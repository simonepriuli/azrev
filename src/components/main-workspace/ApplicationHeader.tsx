import { GitMergeIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { PullRequestHeaderActions } from "./pullRequestActionUiState";
import type { PullRequestStatusPresentation } from "./pullRequestStatusPresentation";
import { SidebarToggleButton } from "./SidebarToggleButton";

type ApplicationHeaderProps = {
  reserveSidebarToggleSpace: boolean;
  showSidebarToggle: boolean;
  sidebarToggleClassName?: string;
  pullRequestId: number;
  title: string;
  status: PullRequestStatusPresentation;
  onToggleSidebar: () => void;
  pullRequestActions?: PullRequestHeaderActions;
};

export function ApplicationHeader({
  reserveSidebarToggleSpace,
  showSidebarToggle,
  sidebarToggleClassName = "",
  pullRequestId,
  title,
  status,
  onToggleSidebar,
  pullRequestActions,
}: ApplicationHeaderProps) {
  const showActionRow =
    pullRequestActions &&
    (pullRequestActions.showApprove || pullRequestActions.showMerge);

  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center">
        <div
          className={`shrink-0 overflow-hidden transition-[width] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            reserveSidebarToggleSpace ? sidebarToggleClassName : "w-0"
          }`}
        >
          <SidebarToggleButton
            expanded={false}
            tabIndex={showSidebarToggle ? undefined : -1}
            className={`shrink-0 transition-opacity duration-200 ${
              showSidebarToggle
                ? "opacity-100"
                : "pointer-events-none opacity-0"
            }`}
            onClick={onToggleSidebar}
          />
        </div>

        <h2 className="flex min-w-0 flex-1 items-center gap-2 text-base font-medium text-slate-900">
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

      {showActionRow && pullRequestActions ? (
        <div className="app-region-no-drag flex shrink-0 items-center gap-2">
          {pullRequestActions.showApprove ? (
            <button
              type="button"
              className="inline-flex w-[6rem] shrink-0 items-center justify-center gap-1.5 rounded-xl [corner-shape:squircle] border border-slate-200 bg-transparent px-3 py-1.5 text-xs font-medium text-slate-900 hover:border-slate-300 hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-50"
              disabled={
                pullRequestActions.approveDisabled ||
                pullRequestActions.approvePending ||
                pullRequestActions.mergePending
              }
              title={
                pullRequestActions.approveDisabled &&
                pullRequestActions.approveDisabledReason
                  ? pullRequestActions.approveDisabledReason
                  : "Approve this pull request"
              }
              aria-busy={pullRequestActions.approvePending}
              onClick={pullRequestActions.onApprove}
            >
              <HugeiconsIcon
                icon={Tick02Icon}
                size={15}
                strokeWidth={1.7}
                aria-hidden
              />
              <span className="truncate">
                {pullRequestActions.approvePending ? "Approving…" : "Approve"}
              </span>
            </button>
          ) : null}
          {pullRequestActions.showMerge ? (
            <button
              type="button"
              className="inline-flex w-[6rem] shrink-0 items-center justify-center gap-1.5 rounded-xl [corner-shape:squircle] border border-neutral-800 bg-black px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:border-neutral-700 hover:bg-neutral-900 disabled:pointer-events-none disabled:opacity-50"
              disabled={
                pullRequestActions.mergeDisabled ||
                pullRequestActions.mergePending ||
                pullRequestActions.approvePending
              }
              title={
                pullRequestActions.mergeDisabled &&
                pullRequestActions.mergeDisabledReason
                  ? pullRequestActions.mergeDisabledReason
                  : "Merge and complete this pull request"
              }
              aria-busy={pullRequestActions.mergePending}
              onClick={pullRequestActions.onMerge}
            >
              <HugeiconsIcon
                icon={GitMergeIcon}
                size={15}
                strokeWidth={1.7}
                aria-hidden
              />
              <span className="truncate">
                {pullRequestActions.mergePending ? "Merging…" : "Merge"}
              </span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
