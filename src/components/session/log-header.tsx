'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from './date-picker';
import { AddSessionDialog } from './add-session-dialog';
import type { Project } from '@/lib/db/schema';

interface LogHeaderProps {
    readonly currentDate: Date;
    readonly projects: ReadonlyArray<Project>;
}

export function LogHeader({ currentDate, projects }: LogHeaderProps) {
    const [dialogOpen, setDialogOpen] = useState(false);

    return (
        <>
            <div className="flex items-center gap-3">
                <DatePicker currentDate={currentDate} />
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setDialogOpen(true)}
                    className="inline-flex items-center gap-1.5"
                >
                    <Plus className="h-4 w-4" aria-hidden />
                    Add session
                </Button>
            </div>
            <AddSessionDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                date={currentDate}
                projects={projects}
            />
        </>
    );
}
