import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-medium cursor-pointer select-none transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-sm',
        destructive: 'bg-[var(--destructive)] text-white hover:bg-[var(--destructive-hover)] shadow-sm',
        outline: 'border border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface)]',
        secondary: 'bg-[var(--surface-active)] text-[var(--text-primary)] hover:bg-[var(--border-strong)]',
        ghost: 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]',
        success: 'bg-[var(--success)] text-white hover:bg-[var(--success-hover)] shadow-sm',
        link: 'bg-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline-offset-4 hover:underline p-0 h-auto shadow-none',
      },
      size: {
        default: 'h-10 px-4 text-[14px] rounded-[var(--radius-md)]',
        sm: 'h-9 px-3 text-[13px] rounded-[var(--radius-md)]',
        lg: 'h-11 px-5 text-[14px] rounded-[var(--radius-lg)]',
        icon: 'h-9 w-9 p-0 rounded-[var(--radius-md)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        data-variant={variant}
        data-size={size}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
