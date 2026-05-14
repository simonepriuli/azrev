export const isMacUA =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)

export const electronMacVibrancy =
  typeof window !== 'undefined' && window.azrev?.nativeVibrancyEnabled === true

export const mainSidebarToggleDelayMs = 120

export const popoverSurface =
  'rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]'
export const textPrimary = 'text-[#1A1A1A]'
export const textHeaderLabel = 'text-[#A9A9AA]'
export const rowHover = 'rounded-lg hover:bg-slate-900/5'
export const panelRow = 'flex h-8 min-h-8 max-h-8 w-full shrink-0 items-center gap-3 px-3'
export const iconPrimary = 'text-[#1A1A1A]'
export const iconMuted = 'text-[#737373]'
