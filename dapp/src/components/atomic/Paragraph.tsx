import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

export const paragraphVariants = cva(
  "text-base !text-white", // base styles, ! for specificity
  {
    variants: {
      size: {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface ParagraphProps extends React.HTMLAttributes<HTMLParagraphElement>, VariantProps<typeof paragraphVariants> {}

export const Paragraph: React.FC<ParagraphProps> = ({ className, size, ...props }) => (
  <p className={paragraphVariants({ size, className })} {...props} />
); 