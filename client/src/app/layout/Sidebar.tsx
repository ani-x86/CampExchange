import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingBag, PlusSquare, MessageSquare, User, PanelLeftClose, PanelLeft } from 'lucide-react';
import clsx from 'clsx';
import { useUiStore } from '@/store/ui';

interface SidebarProps {
  unreadCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ unreadCount = 0 }) => {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  const navItems = [
    { to: '/', label: 'Browse', icon: <ShoppingBag className="w-4 h-4 shrink-0" /> },
    { to: '/sell', label: 'Sell Item', icon: <PlusSquare className="w-4 h-4 shrink-0" /> },
    {
      to: '/inbox',
      label: 'Inbox',
      icon: <MessageSquare className="w-4 h-4 shrink-0" />,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { to: '/profile', label: 'Profile', icon: <User className="w-4 h-4 shrink-0" /> },
  ];

  return (
    <aside
      className={clsx(
        'hidden lg:flex flex-col border-r border-line bg-bg transition-[width] duration-150 ease-out z-30 shrink-0 h-screen sticky top-0',
        sidebarCollapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-3.5 border-b border-line shrink-0">
        {!sidebarCollapsed && (
          <NavLink to="/" className="flex items-center gap-2 text-ink font-semibold tracking-tight text-15">
            <div className="w-6 h-6 bg-accent rounded-sm flex items-center justify-center text-white text-12 font-bold">
              C
            </div>
            <span>Camp-Exchange</span>
          </NavLink>
        )}
        {sidebarCollapsed && (
          <div className="w-full flex justify-center">
            <div className="w-7 h-7 bg-accent rounded-sm flex items-center justify-center text-white text-13 font-bold">
              C
            </div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={sidebarCollapsed ? item.label : undefined}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-2.5 py-2 text-13 font-medium rounded-sm transition-colors relative group select-none',
                isActive
                  ? 'bg-surface text-accent font-semibold border border-line'
                  : 'text-mute hover:text-ink hover:bg-surface border border-transparent',
                sidebarCollapsed && 'justify-center px-0'
              )
            }
          >
            {item.icon}
            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            {item.badge !== undefined && (
              <span
                className={clsx(
                  'font-mono text-11 px-1.5 py-0.2 rounded-sm bg-accent text-white font-semibold',
                  sidebarCollapsed ? 'absolute -top-1 -right-1 px-1 text-[10px]' : 'ml-auto'
                )}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Toggle Sidebar Footer */}
      <div className="p-2 border-t border-line shrink-0">
        <button
          type="button"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar ([)' : 'Collapse sidebar ([)'}
          className="w-full flex items-center justify-center gap-2 p-2 text-mute hover:text-ink hover:bg-surface rounded-sm transition-colors text-12 cursor-pointer"
        >
          {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          {!sidebarCollapsed && <span>Collapse Sidebar</span>}
        </button>
      </div>
    </aside>
  );
};
