"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';

export function Navbar() {
  const pathname = usePathname();

  const linkBase = "dark:text-blue-400 text-blue-600 hover:underline";
  const active = "font-bold";

  return (
    <div className="container mx-auto my-4">
      <Card>
        <div className='flex flex-row justify-between items-center p-3'>
          <div className="flex justify-start gap-4">
            <Link href="/add" className={`${linkBase} ${pathname === '/add' ? active : ''}`}>
              Add
            </Link>
            <Link href="/remove" className={`${linkBase} ${pathname === '/remove' ? active : ''}`}>
              Remove
            </Link>
            <Link href="/orphan" className={`${linkBase} ${pathname === '/orphan' ? active : ''}`}>
              Orphan
            </Link>
          </div>
          <Link href="/" className={linkBase}>
            Back
          </Link>
        </div>
      </Card>
    </div>
  );
}
