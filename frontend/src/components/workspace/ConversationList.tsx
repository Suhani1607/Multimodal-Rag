import React from 'react';
import { MessageSquare, Plus, Trash2, ChevronRight, Clock } from 'lucide-react';
import { Conversation, Project } from '../../types';
import { Button } from '../common/Button';

interface ConversationListProps {
  project: Project;
  conversations: Conversation[];
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  project,
  conversations,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0A10] overflow-y-auto p-6 md:p-8">
      {/* Workspace Header */}
      <div className="flex items-start justify-between pb-6 border-b border-[#302B3D]/60 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F3FA] tracking-tight mb-1">
            {project.name}
          </h1>
          <p className="text-sm text-[#A6A0B5]">
            {project.description || 'Project knowledge base & AI document assistant'}
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={onNewConversation}
          leftIcon={<Plus className="w-4 h-4 text-[#A78BFA]" />}
          className="text-xs font-semibold hover:border-[#A78BFA]/50"
        >
          New conversation
        </Button>
      </div>

      {/* Conversations Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#A6A0B5] uppercase tracking-wider">
          Conversations
        </h2>
        <span className="text-xs text-[#A6A0B5] bg-[#171521] px-2 py-0.5 rounded-full border border-[#302B3D]">
          {conversations.length}
        </span>
      </div>

      {/* Empty State vs List */}
      {conversations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-[#302B3D] rounded-2xl bg-[#171521]/30 my-4">
          <div className="w-14 h-14 rounded-2xl bg-[#171521] border border-[#302B3D] flex items-center justify-center text-[#A6A0B5] mb-4 shadow-sm">
            <MessageSquare className="w-7 h-7 text-[#A78BFA]" />
          </div>
          <h3 className="text-base font-semibold text-[#F5F3FA] mb-2">
            No conversations yet
          </h3>
          <p className="text-xs text-[#A6A0B5] max-w-sm mb-6 leading-relaxed">
            Start your first conversation in this project to analyze documents and get insights from your AI assistant.
          </p>
          <Button
            variant="secondary"
            onClick={onNewConversation}
            leftIcon={<Plus className="w-4 h-4 text-[#A78BFA]" />}
            className="border-[#302B3D] hover:border-[#A78BFA]/40 font-medium text-xs px-5 py-2.5"
          >
            Start first conversation
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className="group bg-[#171521] border border-[#302B3D] hover:border-[#A78BFA]/50 rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#201D2B] border border-[#302B3D] flex items-center justify-center text-[#A78BFA] group-hover:border-[#A78BFA]/40 transition-colors flex-shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-[#F5F3FA] group-hover:text-[#A78BFA] transition-colors truncate">
                    {conv.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-[#6B657A] mt-0.5">
                    <span>{conv.messageCount} messages</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(conv.updatedAt || conv.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete ${conv.title}?`)) {
                      onDeleteConversation(conv.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-[#6B657A] hover:text-[#FB7185] transition-all rounded hover:bg-[#201D2B]"
                  title="Delete conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-[#6B657A] group-hover:text-[#A78BFA] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
