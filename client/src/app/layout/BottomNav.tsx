import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingBag, PlusCircle, MessageSquare, User } from 'lucide-react';
import clsx from 'clsx';

interface BottomNavProps {
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ unreadCount = 0 }) => {
  const items = [
    { to: '/', label: 'Browse', icon: <ShoppingBag className="w-5 h-5" /> },
    { to: '/sell', label: 'Sell', icon: <PlusCircle className="w-5 h-5" /> },
    {
      to: '/inbox',
      label: 'Inbox',
      icon: <MessageSquare className="w-5 h-5" />,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { to: '/profile', label: 'Me', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-bg border-t border-line z-30 flex items-center justify-around px-2 select-none">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center w-16 h-full gap-0.5 relative transition-colors',
              isActive ? 'text-accent font-semibold' : 'text-mute hover:text-ink'
            )
          }
        >
          <div className="relative">
            {item.icon}
            {item.badge !== undefined && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-sm bg-accent text-white font-mono text-[10px] font-bold flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </div>
          <span className="text-[11px]">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
