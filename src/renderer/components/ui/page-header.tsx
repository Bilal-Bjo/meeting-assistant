import * as React from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '../../lib/utils'

interface PageHeaderProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
  backLabel?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ 
  title, 
  showBack = false, 
  onBack, 
  backLabel = 'Back',
  children, 
  className 
}: PageHeaderProps) {
  return (
    <header 
      className={cn(
        'drag-region h-auto sm:h-[var(--header-height)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0 sm:justify-between px-3 sm:px-4 py-3 sm:py-0 border-b border-[var(--border)]',
        className
      )}
      style={{ paddingLeft: 'max(0.75rem, calc(var(--traffic-light-width) + 8px))' }}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {showBack && onBack && (
          <button
            onClick={onBack}
            className="back-btn flex items-center gap-1.5 no-drag shrink-0"
          >
            <ArrowLeft />
            <span className="hidden sm:inline">{backLabel}</span>
          </button>
        )}
        {title && !showBack && (
          <h1 className="text-[14px] sm:text-[15px] font-semibold text-[var(--text-primary)] truncate">{title}</h1>
        )}
      </div>
      
      {title && showBack && (
        <h1 className="hidden sm:block absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold text-[var(--text-primary)]">
          {title}
        </h1>
      )}
      
      <div className="flex items-center gap-2 no-drag">
        {children}
      </div>
    </header>
  )
}

