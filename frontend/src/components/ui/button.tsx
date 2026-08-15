import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/35 border border-indigo-500/30',
        destructive:
          'bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-600/25 hover:shadow-rose-600/35 border border-rose-500/30',
        outline:
          'border border-slate-700 bg-slate-900/60 hover:bg-slate-800 hover:text-white text-slate-200 shadow-sm',
        secondary:
          'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700/60 shadow-sm',
        ghost: 'hover:bg-slate-800 hover:text-slate-100 text-slate-300',
        link: 'text-indigo-400 underline-offset-4 hover:underline p-0 h-auto font-medium',
        glow: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/40 hover:shadow-indigo-600/60 border border-indigo-400/30',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-[11px]',
        lg: 'h-10 rounded-xl px-6 text-sm',
        icon: 'h-8 w-8 rounded-lg p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
