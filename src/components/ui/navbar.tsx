"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function Navbar() {
    const pathname = usePathname();

    return (
        <div className="container mx-auto my-4">
            <Card>
                <div className="flex justify-start items-center p-3 gap-2">
                    <Button asChild variant="link" className={pathname === '/add' ? 'font-bold' : ''}>
                        <Link href="/add">Add</Link>
                    </Button>
                    <Button asChild variant="link" className={pathname === '/remove' ? 'font-bold' : ''}>
                        <Link href="/remove">Remove</Link>
                    </Button>
                    <Button asChild variant="link" className={pathname === '/orphan' ? 'font-bold' : ''}>
                        <Link href="/orphan">Orphan</Link>
                    </Button>
                </div>
            </Card>
        </div>
    );
}
