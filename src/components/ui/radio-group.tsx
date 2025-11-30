import * as React from 'react'
import { cn } from '@/lib/utils'

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('grid gap-2', className)} {...props}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            const childProps = child.props as { value?: string }
            return React.cloneElement(child as React.ReactElement<any>, {
              checked: childProps.value === value,
              onClick: () => childProps.value && onValueChange?.(childProps.value),
            })
          }
          return child
        })}
      </div>
    )
  }
)
RadioGroup.displayName = 'RadioGroup'

interface RadioGroupItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  checked?: boolean
}

const RadioGroupItem = React.forwardRef<HTMLDivElement, RadioGroupItemProps>(
  ({ className, value, checked, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center space-x-2 cursor-pointer rounded-lg border-2 p-4 transition-all hover:bg-accent/50',
          checked ? 'border-primary bg-primary/5' : 'border-muted',
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
            checked ? 'border-primary' : 'border-muted-foreground'
          )}
        >
          {checked && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
        </div>
        <div className="flex-1">{children}</div>
      </div>
    )
  }
)
RadioGroupItem.displayName = 'RadioGroupItem'

export { RadioGroup, RadioGroupItem }
