import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'violet' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  const variantStyles = {
    success: 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30',
    warning: 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/30',
    error: 'bg-[#FB7185]/10 text-[#FB7185] border border-[#FB7185]/30',
    info: 'bg-[#93C5FD]/10 text-[#93C5FD] border border-[#93C5FD]/30',
    violet: 'bg-[#A78BFA]/15 text-[#C4B5FD] border border-[#A78BFA]/30',
    neutral: 'bg-[#171521] text-[#A6A0B5] border border-[#302B3D]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
