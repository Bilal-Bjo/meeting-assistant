import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 sm:h-10 w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-[13px] sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus:outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }

