'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, GitBranch, Check, Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fetchReposForConnection } from '@/actions/github-actions';
import { createProject } from '@/actions/project-actions';
import type { GithubConnection } from '@/lib/db/schema';
import type { GitHubRepo } from '@/types';

const IMPORT_COLORS = [
    '#A0A0FF',
    '#FF6B6B',
    '#4ADE80',
    '#FBBF24',
    '#A78BFA',
    '#F472B6',
    '#22D3EE',
    '#FB923C',
] as const;

function pickColor(index: number): string {
    return IMPORT_COLORS[index % IMPORT_COLORS.length];
}

interface RepoImportDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly connections: ReadonlyArray<GithubConnection>;
    readonly existingRepoUrls: ReadonlySet<string>;
    readonly preselectedConnectionId?: string;
    readonly onImported?: () => void;
}

export function RepoImportDialog({
    open,
    onClose,
    connections,
    existingRepoUrls,
    preselectedConnectionId,
    onImported,
}: RepoImportDialogProps) {
    const router = useRouter();
    const [selectedConnectionId, setSelectedConnectionId] = useState(
        preselectedConnectionId ?? ''
    );
    const [repos, setRepos] = useState<ReadonlyArray<GitHubRepo>>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importingRepoId, setImportingRepoId] = useState<number | null>(null);
    const [isPending, startTransition] = useTransition();

    const filteredRepos = useMemo(() => {
        if (!search.trim()) return repos;
        const query = search.toLowerCase();
        return repos.filter(
            (repo) =>
                repo.name.toLowerCase().includes(query) ||
                repo.fullName.toLowerCase().includes(query) ||
                (repo.description?.toLowerCase().includes(query) ?? false)
        );
    }, [repos, search]);

    const [prevOpen, setPrevOpen] = useState(false);
    if (open && !prevOpen && preselectedConnectionId) {
        setPrevOpen(true);
        setRepos([]);
        setSearch('');
        setError(null);
        setIsLoading(true);
        startTransition(async () => {
            const result = await fetchReposForConnection(preselectedConnectionId);
            setIsLoading(false);
            if (result.success) {
                setRepos(result.data);
            } else {
                setError(result.error);
            }
        });
    }
    if (!open && prevOpen) {
        setPrevOpen(false);
    }

    function loadRepos(connectionId: string) {
        setRepos([]);
        setSearch('');
        setError(null);

        if (!connectionId) return;

        setIsLoading(true);
        startTransition(async () => {
            const result = await fetchReposForConnection(connectionId);
            setIsLoading(false);
            if (result.success) {
                setRepos(result.data);
            } else {
                setError(result.error);
            }
        });
    }

    function handleConnectionChange(connectionId: string) {
        setSelectedConnectionId(connectionId);
        loadRepos(connectionId);
    }

    function handleImport(repo: GitHubRepo, index: number) {
        setImportingRepoId(repo.id);
        startTransition(async () => {
            const formData = new FormData();
            formData.set('name', repo.name);
            formData.set('description', repo.description ?? '');
            formData.set('color', pickColor(index));
            formData.set('githubRepoUrl', repo.htmlUrl);
            formData.set('githubOwner', repo.owner);
            formData.set('githubRepoName', repo.name);

            const result = await createProject(formData);
            setImportingRepoId(null);

            if (result.success) {
                router.refresh();
                onImported?.();
            } else {
                setError(result.error);
            }
        });
    }

    function handleClose() {
        setSelectedConnectionId(preselectedConnectionId ?? '');
        setRepos([]);
        setSearch('');
        setError(null);
        onClose();
    }

    const hasConnections = connections.length > 0;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            title="Import from GitHub"
            className="max-w-lg"
        >
            <div className="flex flex-col gap-4">
                {!hasConnections ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                        <GitBranch className="h-8 w-8 text-[var(--text-secondary)]" />
                        <p className="text-[var(--text-secondary)]">
                            No GitHub accounts connected. Connect one in
                            Settings first.
                        </p>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                handleClose();
                                router.push('/settings');
                            }}
                        >
                            Go to Settings
                        </Button>
                    </div>
                ) : (
                    <>
                        {!preselectedConnectionId && (
                            <Select
                                label="GitHub Account"
                                value={selectedConnectionId}
                                onChange={(e) =>
                                    handleConnectionChange(e.target.value)
                                }
                            >
                                <option value="">Select an account</option>
                                {connections.map((conn) => (
                                    <option key={conn.id} value={conn.id}>
                                        {conn.label} (@{conn.githubUsername})
                                    </option>
                                ))}
                            </Select>
                        )}

                        {selectedConnectionId &&
                            !isLoading &&
                            repos.length > 0 && (
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(e.target.value)
                                        }
                                        placeholder="Search repos..."
                                        className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                                    />
                                </div>
                            )}

                        {isLoading && (
                            <div className="flex items-center justify-center gap-2 py-8 text-[var(--text-secondary)]">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">
                                    Fetching repos...
                                </span>
                            </div>
                        )}

                        {error && (
                            <p className="text-sm text-[var(--danger)]">
                                {error}
                            </p>
                        )}

                        {!isLoading &&
                            selectedConnectionId &&
                            repos.length === 0 &&
                            !error && (
                                <p className="py-6 text-center text-sm text-[var(--text-secondary)]">
                                    No repositories found for this account.
                                </p>
                            )}

                        {filteredRepos.length > 0 && (
                            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
                                {filteredRepos.map((repo, index) => {
                                    const alreadyImported =
                                        existingRepoUrls.has(repo.htmlUrl);
                                    const isImporting =
                                        importingRepoId === repo.id;

                                    return (
                                        <li key={repo.id}>
                                            <Card
                                                padding="sm"
                                                className={cn(
                                                    'flex items-start justify-between gap-3 transition-colors',
                                                    alreadyImported
                                                        ? 'opacity-50'
                                                        : 'hover:border-[var(--accent)]/50 cursor-pointer'
                                                )}
                                            >
                                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <GitBranch className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" />
                                                        <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                                                            {repo.fullName}
                                                        </span>
                                                    </div>
                                                    {repo.description && (
                                                        <p className="truncate pl-5.5 text-xs text-[var(--text-secondary)]">
                                                            {repo.description}
                                                        </p>
                                                    )}
                                                </div>

                                                {alreadyImported ? (
                                                    <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--success)]">
                                                        <Check className="h-3.5 w-3.5" />
                                                        Imported
                                                    </span>
                                                ) : (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        disabled={
                                                            isPending ||
                                                            isImporting
                                                        }
                                                        onClick={() =>
                                                            handleImport(
                                                                repo,
                                                                index
                                                            )
                                                        }
                                                    >
                                                        {isImporting ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            'Import'
                                                        )}
                                                    </Button>
                                                )}
                                            </Card>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        {!isLoading &&
                            filteredRepos.length === 0 &&
                            repos.length > 0 &&
                            search && (
                                <p className="py-4 text-center text-sm text-[var(--text-secondary)]">
                                    No repos matching &ldquo;{search}&rdquo;
                                </p>
                            )}
                    </>
                )}
            </div>
        </Dialog>
    );
}
