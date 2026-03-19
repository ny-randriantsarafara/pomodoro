'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Markdown } from './markdown';

interface NoteContentProps {
    readonly content: string;
    readonly className?: string;
    readonly enableMarkdown?: boolean;
}

export function NoteContent({
    content,
    className,
    enableMarkdown = false,
}: NoteContentProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isClamped, setIsClamped] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (el) {
            setIsClamped(el.scrollHeight > el.clientHeight);
        }
    }, [content]);

    return (
        <div>
            <div
                ref={ref}
                className={cn(
                    'text-sm text-[var(--text-secondary)]',
                    !enableMarkdown && 'whitespace-pre-wrap',
                    !isExpanded && 'line-clamp-3',
                    className
                )}
            >
                {enableMarkdown ? <Markdown>{content}</Markdown> : content}
            </div>
            {(isClamped || isExpanded) && (
                <button
                    type="button"
                    onClick={() => setIsExpanded((v) => !v)}
                    className="mt-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                    {isExpanded ? 'Show less' : 'Show more'}
                </button>
            )}
        </div>
    );
}
