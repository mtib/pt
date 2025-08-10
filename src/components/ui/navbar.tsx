"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';

export function Navbar() {
    const pathname = usePathname();

    return (
        <div className="container mx-auto my-4">
            <Card>
                <div className="flex justify-start items-center p-4 gap-4">
                    <Link href="/add" className={pathname === '/add' ? 'font-bold hover:underline' : 'hover:underline'}>Add</Link>
                    <Link href="/remove" className={pathname === '/remove' ? 'font-bold hover:underline' : 'hover:underline'}>Remove</Link>
                    <Link href="/orphan" className={pathname === '/orphan' ? 'font-bold hover:underline' : 'hover:underline'}>Orphan</Link>
                </div>
            </Card>
        </div>
    );
}
