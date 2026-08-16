import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { cn } from '../../lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
  className,
}) => {
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  }[maxWidth];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(maxWidthClass, className, 'p-0 flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden')}>
        {(title || description) && (
          <DialogHeader className="p-4 sm:p-5 flex-shrink-0 border-b border-slate-800/80 pr-12 text-left">
            {title && (
              <DialogTitle>
                {typeof title === 'string' ? (
                  <span className="text-base sm:text-lg font-bold text-slate-100">{title}</span>
                ) : (
                  title
                )}
              </DialogTitle>
            )}
            {description && <DialogDescription className="text-xs text-slate-400 mt-1">{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0 max-w-full">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};
