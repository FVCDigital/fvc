import * as React from 'react';
import { Button as ShadcnButton, buttonVariants } from '@/components/ui/button';
import type { VariantProps } from "class-variance-authority";

// Extend the button props to include variant and size
interface CustomButtonProps extends React.ComponentPropsWithoutRef<"button">, VariantProps<typeof buttonVariants> {}

const CustomButton = React.forwardRef<HTMLButtonElement, CustomButtonProps>(
  ({ children, className, variant, size, ...props }, ref) => (
    <ShadcnButton
      ref={ref}
      variant={variant}
      size={size}
      className={
        `
          bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8]
          text-white
          font-semibold
          rounded-lg
          shadow-lg
          px-8 py-3
          transition
          hover:from-[#38bdf8] hover:to-[#0ea5e9]
          focus:outline-none focus:ring-2 focus:ring-[#38bdf8] focus:ring-offset-2
          neon-glow
          ${className ?? ''}
        `
      }
      {...props}
    >
      {children}
    </ShadcnButton>
  )
);
CustomButton.displayName = 'CustomButton';

export default CustomButton; 