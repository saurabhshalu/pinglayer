import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'bg-[#798777] text-[#F8EDE3] hover:bg-[#667364] shadow-md shadow-[#798777]/20 hover:shadow-[#798777]/35 border border-[#A2B29F]/30',
        destructive:
          'bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-600/25 hover:shadow-rose-600/35 border border-rose-500/30',
        outline:
          'border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 hover:text-[#F8EDE3] text-slate-200 shadow-sm',
        secondary:
          'bg-slate-800 text-[#F8EDE3] hover:bg-slate-700/90 border border-slate-700/60 shadow-sm',
        ghost: 'hover:bg-slate-800/80 hover:text-[#F8EDE3] text-slate-300',
        link: 'text-[#BDD2B6] underline-offset-4 hover:underline hover:text-[#F8EDE3] p-0 h-auto font-medium',
        glow: 'bg-gradient-to-r from-[#798777] to-[#A2B29F] text-[#F8EDE3] shadow-lg shadow-[#798777]/30 hover:shadow-[#798777]/50 border border-[#BDD2B6]/40',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-[11px]',
        lg: 'h-10 rounded-lg px-6 text-sm',
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
