import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';
import { useAppAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';

interface SidebarProps {
  onNewProject: () => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onNewProject,
  collapsed,
  setCollapsed,
}) => {
  const { user } = useAppAuth();

  return (
    <aside
      className={`relative h-screen bg-[#100F17] border-r border-[#302B3D] flex flex-col transition-all duration-200 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#302B3D]/60">
        <NavLink to="/projects" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] flex items-center justify-center text-[#0B0A10] shadow-sm flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-base text-[#F5F3FA] tracking-tight">
              CogniVault
            </span>
          )}
        </NavLink>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md text-[#A6A0B5] hover:text-[#F5F3FA] hover:bg-[#171521] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Action: New Project */}
      <div className="p-3">
        {collapsed ? (
          <button
            onClick={onNewProject}
            className="w-full h-10 rounded-lg bg-[#171521] border border-[#302B3D] hover:border-[#A78BFA]/50 text-[#F5F3FA] flex items-center justify-center transition-colors"
            title="New project"
          >
            <Plus className="w-5 h-5" />
          </button>
        ) : (
          <Button
            variant="secondary"
            onClick={onNewProject}
            className="w-full justify-start text-xs font-medium border-[#302B3D] hover:border-[#A78BFA]/40"
            leftIcon={<Plus className="w-4 h-4 text-[#A78BFA]" />}
          >
            New project
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        <NavLink
          to="/projects"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
              isActive
                ? 'bg-[#171521] text-[#F5F3FA] font-medium border-l-2 border-[#A78BFA]'
                : 'text-[#A6A0B5] hover:text-[#F5F3FA] hover:bg-[#171521]/60'
            } ${collapsed ? 'justify-center px-0' : ''}`
          }
          title="Projects"
        >
          <FolderKanban className="w-4 h-4 text-[#A78BFA]" />
          {!collapsed && <span>Projects</span>}
        </NavLink>
      </nav>

      {/* Official Clerk User Profile Button */}
      <div className="p-3 border-t border-[#302B3D]/60 bg-[#0B0A10]/40 flex items-center justify-center">
        <div className="w-full flex items-center gap-3 p-1 rounded-lg hover:bg-[#171521]/60 transition-colors">
          <UserButton
            showName={!collapsed}
            userProfileMode="modal"
            appearance={{
              elements: {
                userButtonAvatarBox: 'w-8 h-8 rounded-full border border-[#302B3D]',
                userButtonOuterIdentifier: 'text-xs font-medium text-[#F5F3FA]',
                userButtonBox: 'flex items-center gap-2',
              },
            }}
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[#A6A0B5] truncate">
                {user?.email || 'Clerk Verified'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
