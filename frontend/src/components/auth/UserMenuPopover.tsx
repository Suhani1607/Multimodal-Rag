import React, { useEffect, useRef } from 'react';
import { LogOut, User, Shield, Sparkles, ExternalLink, Settings } from 'lucide-react';
import { useAppAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

interface UserMenuPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestSignOut: () => void;
  collapsed?: boolean;
}

export const UserMenuPopover: React.FC<UserMenuPopoverProps> = ({
  isOpen,
  onClose,
  onRequestSignOut,
  collapsed = false,
}) => {
  const { user, openUserProfile } = useAppAuth();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className={`absolute z-50 w-72 bg-[#171521] border border-[#302B3D] rounded-xl shadow-[0_10px_35px_-5px_rgba(0,0,0,0.8),0_0_20px_-5px_rgba(167,139,250,0.2)] overflow-hidden animate-fade-in ${
        collapsed ? 'bottom-4 left-16' : 'bottom-16 left-3'
      }`}
    >
      {/* Header Profile Card */}
      <div className="p-4 border-b border-[#302B3D] bg-[#100F17]/80">
        <div className="flex items-center gap-3">
          <div className="relative">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.fullName}
                className="w-11 h-11 rounded-full object-cover border border-[#4A435C]"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#201D2B] border border-[#302B3D] flex items-center justify-center text-sm font-semibold text-[#A78BFA]">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
            )}
            {/* Online green indicator */}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#4ADE80] border-2 border-[#100F17] rounded-full ring-1 ring-black/40" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#F5F3FA] truncate">
              {user?.fullName || 'User'}
            </p>
            <p className="text-xs text-[#A6A0B5] truncate">{user?.email}</p>
            <div className="mt-1 flex items-center gap-1">
              <Badge variant="violet" size="sm">
                Clerk Verified
              </Badge>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#302B3D]/50 flex items-center justify-between text-[11px] text-[#A6A0B5]">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-[#4ADE80]" />
            Secure Session
          </span>
          {openUserProfile && (
            <button
              onClick={() => {
                onClose();
                openUserProfile();
              }}
              className="flex items-center gap-1 text-[#A78BFA] hover:text-[#C4B5FD] transition-colors"
            >
              <Settings className="w-3 h-3" />
              Manage Account
            </button>
          )}
        </div>
      </div>

      {/* Account actions */}
      <div className="p-2 space-y-1 bg-[#100F17]/50">
        {openUserProfile && (
          <button
            onClick={() => {
              onClose();
              openUserProfile();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#A6A0B5] hover:text-[#F5F3FA] hover:bg-[#201D2B] transition-all"
          >
            <User className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span>Profile & Security Settings</span>
          </button>
        )}

        <button
          onClick={() => {
            onClose();
            onRequestSignOut();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#FB7185] hover:bg-[#FB7185]/10 border border-transparent hover:border-[#FB7185]/30 transition-all"
        >
          <LogOut className="w-3.5 h-3.5 text-[#FB7185]" />
          <span>Sign Out of CogniVault</span>
        </button>
      </div>
    </div>
  );
};
