import ReactMarkdown from 'react-markdown';

interface MarkdownProps {
    readonly children: string;
}

export function Markdown({ children }: MarkdownProps) {
    return (
        <ReactMarkdown
            components={{
                // Headings - keep small to fit description context
                h1: ({ children }) => (
                    <h1 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                        {children}
                    </h1>
                ),
                h2: ({ children }) => (
                    <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                        {children}
                    </h2>
                ),
                h3: ({ children }) => (
                    <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                        {children}
                    </h3>
                ),
                // Paragraphs
                p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                // Text formatting
                strong: ({ children }) => (
                    <strong className="font-semibold text-[var(--text-primary)]">
                        {children}
                    </strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                // Links
                a: ({ href, children }) => (
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-2"
                    >
                        {children}
                    </a>
                ),
                // Lists
                ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-1 space-y-0.5">
                        {children}
                    </ul>
                ),
                ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-1 space-y-0.5">
                        {children}
                    </ol>
                ),
                li: ({ children }) => <li>{children}</li>,
                // Code
                code: ({ children }) => (
                    <code className="bg-[var(--border)]/50 px-1 py-0.5 rounded text-xs font-mono">
                        {children}
                    </code>
                ),
                pre: ({ children }) => (
                    <pre className="bg-[var(--border)]/50 p-2 rounded text-xs font-mono overflow-x-auto mb-1">
                        {children}
                    </pre>
                ),
                // Blockquote
                blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-[var(--border)] pl-2 italic mb-1">
                        {children}
                    </blockquote>
                ),
                // Horizontal rule
                hr: () => <hr className="border-[var(--border)] my-2" />,
            }}
        >
            {children}
        </ReactMarkdown>
    );
}
