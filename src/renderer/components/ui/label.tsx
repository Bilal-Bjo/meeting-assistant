import * as React from 'react'
import { cn } from '../../lib/utils'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn('label', className)}
        {...props}
      >
        {children}
      </label>
    )
  }
)
Label.displayName = 'Label'

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="hint">{children}</p>
  )
}

export { Label, Hint }

