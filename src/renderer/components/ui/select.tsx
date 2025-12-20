import * as React from 'react'
import { cn } from '../../lib/utils'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            'flex h-9 sm:h-10 w-full appearance-none rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 pr-10 text-[13px] sm:text-sm text-[var(--text-primary)] transition-colors focus:outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--text-tertiary)] pointer-events-none" />
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }

