'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { deleteSession } from '@/actions/session-actions';

interface DeleteSessionDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly sessionId: string;
}

export function DeleteSessionDialog({ open, onClose, sessionId }: DeleteSessionDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setError(null);
        setIsDeleting(true);

        const result = await deleteSession(sessionId);

        if (!result.success) {
            setError(result.error);
            setIsDeleting(false);
        }
        // On success the page revalidates and the card disappears — no need to call onClose
    };

    return (
        <Dialog open={open} onClose={onClose} title="Delete session">
            <div className="flex flex-col gap-5">
                <p className="text-sm text-[var(--text-secondary)]">
                    Delete this session? This cannot be undone.
                </p>

                {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        size="md"
                        className="flex-1"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        size="md"
                        className="flex-1"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Deleting…' : 'Delete'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
