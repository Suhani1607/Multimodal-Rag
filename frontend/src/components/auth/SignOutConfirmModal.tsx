import React from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAppAuth } from '../../context/AuthContext';

interface SignOutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const SignOutConfirmModal: React.FC<SignOutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { user } = useAppAuth();

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="p-6 text-center">
        {/* Amber Glow Icon */}
        <div className="mx-auto w-12 h-12 rounded-full bg-[#F5B544]/15 border border-[#F5B544]/30 flex items-center justify-center text-[#F5B544] mb-4 shadow-[0_0_20px_-3px_rgba(245,181,68,0.3)]">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-semibold text-[#F5F3FA] mb-2">
          Sign out of CogniVault?
        </h3>

        <p className="text-xs text-[#A6A0B5] mb-6 leading-relaxed">
          You are currently signed in as{' '}
          <span className="font-semibold text-[#F5F3FA]">{user?.fullName || 'User'}</span>
          {user?.email ? ` (${user.email})` : ''}.
          <br />
          Your uploaded documents, conversation chats, and vectorized chunks will remain securely stored in the system.
        </p>

        <div className="flex items-center gap-3 justify-center">
          <Button variant="ghost" size="md" onClick={onClose} className="w-1/2">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            leftIcon={<LogOut className="w-4 h-4" />}
            className="w-1/2 bg-[#FB7185] hover:bg-[#E11D48] text-white border-0"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </Modal>
  );
};
