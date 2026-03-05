import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    padding?: 'sm' | 'md' | 'lg';
}

const paddingStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
} as const;

export function Card({ className, padding = 'md', ...props }: CardProps) {
    return (
        <div
            className={cn(
                'rounded-xl border border-[#1F1F23] bg-[#141416]',
                paddingStyles[padding],
                className
            )}
            {...props}
        />
    );
}

export type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

export function CardHeader({ className, ...props }: CardHeaderProps) {
    return <div className={cn('mb-4', className)} {...props} />;
}

export type CardContentProps = HTMLAttributes<HTMLDivElement>;

export function CardContent({ className, ...props }: CardContentProps) {
    return <div className={cn('', className)} {...props} />;
}

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

export function CardFooter({ className, ...props }: CardFooterProps) {
    return (
        <div
            className={cn('mt-4 flex items-center gap-2', className)}
            {...props}
        />
    );
}
