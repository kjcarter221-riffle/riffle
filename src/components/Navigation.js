'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, CloudSun, BookOpen, Users } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', icon: Home, label: 'Home' },
    { href: '/chat', icon: MessageCircle, label: 'AI Guide' },
    { href: '/conditions', icon: CloudSun, label: 'Conditions' },
    { href: '/journal', icon: BookOpen, label: 'Journal' },
    { href: '/community', icon: Users, label: 'Community' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/20 safe-bottom">
      <div className="max-w-lg mx-auto flex justify-around py-2">
        {links.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
