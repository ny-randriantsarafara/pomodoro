'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface UsePiPReturn {
    readonly isSupported: boolean;
    readonly pipWindow: Window | null;
    readonly openPiP: () => Promise<void>;
    readonly closePiP: () => void;
}

export function usePiP(): UsePiPReturn {
    const isSupported =
        typeof window !== 'undefined' &&
        'documentPictureInPicture' in window;

    const [pipWindow, setPipWindow] = useState<Window | null>(null);
    const pipWindowRef = useRef<Window | null>(null);

    const copyStyles = useCallback((targetDoc: Document) => {
        document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
            targetDoc.head.appendChild(node.cloneNode(true));
        });
    }, []);

    const openPiP = useCallback(async () => {
        if (!isSupported) return;

        if (pipWindowRef.current) {
            pipWindowRef.current.close();
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pip = await (window as any).documentPictureInPicture.requestWindow({
            width: 280,
            height: 220,
        });

        copyStyles(pip.document);

        pip.addEventListener('pagehide', () => {
            setPipWindow(null);
            pipWindowRef.current = null;
        });

        pipWindowRef.current = pip;
        setPipWindow(pip);
    }, [isSupported, copyStyles]);

    const closePiP = useCallback(() => {
        if (pipWindowRef.current) {
            pipWindowRef.current.close();
            pipWindowRef.current = null;
            setPipWindow(null);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (pipWindowRef.current) {
                pipWindowRef.current.close();
            }
        };
    }, []);

    return { isSupported, pipWindow, openPiP, closePiP };
}
