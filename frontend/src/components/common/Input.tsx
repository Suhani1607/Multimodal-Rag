import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-[#A6A0B5]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-[#A6A0B5] pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full bg-[#171521] border border-[#302B3D] text-[#F5F3FA] placeholder-[#6B657A] rounded-lg text-sm px-3.5 py-2 transition-all duration-150 focus:outline-none focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA] ${leftIcon ? 'pl-9' : ''} ${rightIcon ? 'pr-9' : ''} ${error ? 'border-[#FB7185]' : ''} ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 text-[#A6A0B5]">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <span className="text-xs text-[#FB7185] mt-0.5">{error}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
