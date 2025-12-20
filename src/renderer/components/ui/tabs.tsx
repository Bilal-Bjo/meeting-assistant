import * as React from 'react'
import { cn } from '../../lib/utils'

interface TabsProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  tabs: { id: T; label: string; icon?: React.ReactNode }[]
  className?: string
}

export function Tabs<T extends string>({ value, onValueChange, tabs, className }: TabsProps<T>) {
  return (
    <div className={cn('inline-flex flex-wrap gap-1 rounded-[var(--radius-md)] bg-[var(--surface)] p-1 border border-[var(--border-subtle)]', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onValueChange(tab.id)}
          className={cn(
            'h-9 px-3 rounded-[var(--radius-md)] text-[13px] font-medium transition-colors',
            value === tab.id
              ? 'bg-[var(--surface-active)] text-[var(--text-primary)]'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

