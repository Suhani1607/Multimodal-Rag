import React, { useState } from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import {
  Sparkles,
  Shield,
  Layers,
  ArrowRight,
  UserCheck,
  UserPlus,
  LogIn,
  X,
  Loader2,
} from 'lucide-react';
import { useAppAuth, RecentAccount } from '../../context/AuthContext';
import { Button } from '../common/Button';

export const SignInView: React.FC = () => {
  const { isLoaded, recentAccounts, removeRecentAccount } = useAppAuth();
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [selectedRecentEmail, setSelectedRecentEmail] = useState<string | null>(null);

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#0B0A10] text-[#F5F3FA]">
        <div className="w-12 h-12 rounded-2xl bg-[#171521] border border-[#302B3D] flex items-center justify-center mb-4 shadow-[0_0_20px_-3px_rgba(245,181,68,0.3)]">
          <Loader2 className="w-6 h-6 text-[#F5B544] animate-spin" />
        </div>
        <p className="text-xs text-[#A6A0B5]">Loading Clerk Authentication...</p>
      </div>
    );
  }

  const primaryRecent: RecentAccount | undefined = recentAccounts[0];

  return (
    <div className="relative min-h-screen w-screen flex flex-col justify-center items-center p-4 bg-[#0B0A10] text-[#F5F3FA] overflow-y-auto selection:bg-[#A78BFA]/30 selection:text-white">
      {/* Ambient background glow effects */}
      <div className="fixed top-1/4 left-1/3 w-96 h-96 bg-[#A78BFA]/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-1/4 right-1/3 w-96 h-96 bg-[#F5B544]/10 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2" />

      <div className="relative z-10 w-full max-w-md my-8 flex flex-col items-center">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#171521] via-[#201D2B] to-[#171521] border border-[#302B3D] shadow-[0_0_25px_-5px_rgba(245,181,68,0.3)] mb-4">
            <Sparkles className="w-7 h-7 text-[#F5B544]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F5F3FA]">
            CogniVault Platform
          </h1>
          <p className="text-xs text-[#A6A0B5] mt-1 max-w-sm mx-auto">
            Multimodal Document Intelligence & RAG System
          </p>
        </div>

        {/* Recommended Recent Account (if previously signed in) */}
        {primaryRecent && (
          <div className="w-full mb-5 p-4 rounded-2xl bg-[#171521]/90 backdrop-blur-xl border border-[#F5B544]/40 shadow-[0_0_25px_-5px_rgba(245,181,68,0.2)] transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-[#F5B544] uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#F5B544]" />
                Recommended Account
              </span>
              <button
                type="button"
                onClick={() => removeRecentAccount(primaryRecent.id)}
                className="text-[#A6A0B5] hover:text-[#FB7185] p-1 rounded transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {primaryRecent.imageUrl ? (
                <img
                  src={primaryRecent.imageUrl}
                  alt={primaryRecent.fullName}
                  className="w-10 h-10 rounded-full object-cover border border-[#4A435C]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#201D2B] border border-[#302B3D] flex items-center justify-center text-sm font-semibold text-[#A78BFA]">
                  {primaryRecent.fullName.charAt(0)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#F5F3FA] truncate">
                  {primaryRecent.fullName}
                </p>
                <p className="text-[11px] text-[#A6A0B5] truncate">
                  {primaryRecent.email}
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedRecentEmail(primaryRecent.email);
                  setAuthMode('sign-in');
                }}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Auth Mode Toggle Tabs */}
        <div className="w-full mb-4 flex border border-[#302B3D] rounded-xl bg-[#171521] p-1 shadow-md">
          <button
            type="button"
            onClick={() => setAuthMode('sign-in')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              authMode === 'sign-in'
                ? 'bg-[#201D2B] text-[#F5B544] shadow-sm border border-[#302B3D]'
                : 'text-[#A6A0B5] hover:text-[#F5F3FA]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthMode('sign-up')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              authMode === 'sign-up'
                ? 'bg-[#201D2B] text-[#A78BFA] shadow-sm border border-[#302B3D]'
                : 'text-[#A6A0B5] hover:text-[#F5F3FA]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register New User</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#A78BFA]/15 text-[#A78BFA] border border-[#A78BFA]/20">
              New
            </span>
          </button>
        </div>

        {/* Official Clerk Authentication Component */}
        <div className="w-full flex justify-center clerk-auth-container">
          {authMode === 'sign-in' ? (
            <SignIn
              routing="hash"
              signUpUrl="#sign-up"
              initialValues={
                selectedRecentEmail ? { emailAddress: selectedRecentEmail } : undefined
              }
            />
          ) : (
            <SignUp
              routing="hash"
              signInUrl="#sign-in"
            />
          )}
        </div>

        {/* Security & Feature Badges */}
        <div className="w-full mt-6 p-3.5 rounded-xl bg-[#171521]/70 border border-[#302B3D] grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center">
            <Shield className="w-3.5 h-3.5 text-[#4ADE80] mb-1" />
            <span className="text-[10px] text-[#F5F3FA] font-medium">Clerk Auth</span>
            <span className="text-[9px] text-[#A6A0B5]">Official SDK</span>
          </div>
          <div className="flex flex-col items-center">
            <Layers className="w-3.5 h-3.5 text-[#A78BFA] mb-1" />
            <span className="text-[10px] text-[#F5F3FA] font-medium">7-Stage Ingestion</span>
            <span className="text-[9px] text-[#A6A0B5]">Unstructured pipeline</span>
          </div>
          <div className="flex flex-col items-center">
            <Sparkles className="w-3.5 h-3.5 text-[#F5B544] mb-1" />
            <span className="text-[10px] text-[#F5F3FA] font-medium">pgvector RAG</span>
            <span className="text-[9px] text-[#A6A0B5]">Groq LLM citations</span>
          </div>
        </div>
      </div>
    </div>
  );
};
