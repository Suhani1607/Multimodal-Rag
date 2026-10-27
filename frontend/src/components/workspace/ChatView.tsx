import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Send,
  Sparkles,
  User,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  ArrowLeft,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Conversation, Message, Citation } from '../../types';
import { api } from '../../services/api';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface ChatViewProps {
  conversation: Conversation;
  onBack: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  onBack,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load message history
  useEffect(() => {
    let isMounted = true;
    api.getMessages(conversation.id).then((data) => {
      if (isMounted) setMessages(data);
    }).catch((err) => {
      console.warn('Failed to load messages:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [conversation.id]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = input.trim();
    if (!query || isStreaming) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Append optimistic user message
    const userMsg: Message = {
      id: `temp_${Date.now()}`,
      conversationId: conversation.id,
      role: 'user',
      content: query,
      citations: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setIsStreaming(true);
    setStreamingContent('');
    setStreamingCitations([]);

    let accumulatedText = '';
    let accumulatedCitations: Citation[] = [];

    api.streamChat(
      conversation.id,
      query,
      (token) => {
        accumulatedText += token;
        setStreamingContent(accumulatedText);
      },
      (citations) => {
        accumulatedCitations = citations;
        setStreamingCitations(citations);
      },
      () => {
        // Stream completed
        const assistantMsg: Message = {
          id: `msg_${Date.now()}`,
          conversationId: conversation.id,
          role: 'assistant',
          content: accumulatedText,
          citations: accumulatedCitations,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsStreaming(false);
        setStreamingContent('');
        setStreamingCitations([]);
      },
      (err) => {
        console.error('Chat stream error:', err);
        const errorMsg: Message = {
          id: `msg_${Date.now()}`,
          conversationId: conversation.id,
          role: 'assistant',
          content: 'Sorry, I encountered an error while retrieving document evidence.',
          citations: [],
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setIsStreaming(false);
        setStreamingContent('');
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0A10] relative select-none">
      {/* Chat Header */}
      <div className="h-14 px-6 border-b border-[#302B3D]/60 bg-[#100F17]/50 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 rounded-md text-[#A6A0B5] hover:text-[#F5F3FA] hover:bg-[#171521] transition-colors md:hidden"
            title="Back to conversation list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-[#201D2B] border border-[#302B3D] flex items-center justify-center text-[#A78BFA]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F5F3FA] leading-tight">
              {conversation.title}
            </h3>
            <p className="text-[11px] text-[#A6A0B5]">Project Chat</p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="text-xs text-[#A6A0B5] hover:text-[#F5F3FA] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Conversations
        </button>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 && !isStreaming ? (
          /* Empty Chat State matching Screenshot 2 */
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-[#171521] border border-[#302B3D] flex items-center justify-center text-[#A6A0B5] mb-4">
              <FileText className="w-7 h-7 text-[#A78BFA]" />
            </div>
            <h3 className="text-lg font-semibold text-[#F5F3FA] mb-1">
              Start a conversation
            </h3>
            <p className="text-xs text-[#A6A0B5] max-w-sm leading-relaxed">
              Ask me anything about your documents and I'll help you find the answers with exact citations.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${
                  msg.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-[#201D2B] border border-[#A78BFA]/40 flex items-center justify-center text-[#A78BFA] flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#201D2B] border border-[#302B3D] text-[#F5F3FA]'
                      : 'bg-[#171521] border border-[#302B3D] text-[#F5F3FA]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Citations row */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#302B3D]/50 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-[#A6A0B5] mr-1 flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-[#A78BFA]" />
                        Sources:
                      </span>
                      {msg.citations.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedCitation(c)}
                          className="px-2 py-0.5 rounded text-[11px] bg-[#A78BFA]/10 border border-[#A78BFA]/30 text-[#C4B5FD] hover:bg-[#A78BFA]/20 transition-colors flex items-center gap-1"
                        >
                          <span>[{i + 1}]</span>
                          <span>Page {c.page_number || 1}</span>
                          <span className="text-[#6B657A]">
                            ({Math.round(c.score * 100)}%)
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message actions */}
                  {msg.role === 'assistant' && (
                    <div className="mt-2 flex items-center gap-2 pt-1 text-xs text-[#6B657A]">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-[#F5F3FA] transition-colors flex items-center gap-1"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-[#4ADE80]" />
                            <span className="text-[#4ADE80]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-[#171521] border border-[#302B3D] flex items-center justify-center text-[#A6A0B5] flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Real-time Streaming message */}
            {isStreaming && (
              <div className="flex gap-3 max-w-3xl mr-auto justify-start animate-fade-in">
                <div className="w-8 h-8 rounded-lg bg-[#201D2B] border border-[#A78BFA]/40 flex items-center justify-center text-[#A78BFA] flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="bg-[#171521] border border-[#302B3D] rounded-2xl p-4 text-sm leading-relaxed text-[#F5F3FA]">
                  <p className="whitespace-pre-wrap">
                    {streamingContent}
                    <span className="inline-block w-1.5 h-4 ml-1 bg-[#A78BFA] animate-pulse" />
                  </p>

                  {streamingCitations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#302B3D]/50 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-[#A6A0B5] mr-1 flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-[#A78BFA]" />
                        Retrieved Sources:
                      </span>
                      {streamingCitations.map((c, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[11px] bg-[#A78BFA]/10 border border-[#A78BFA]/30 text-[#C4B5FD]"
                        >
                          [{i + 1}] Page {c.page_number || 1}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Composer matching Screenshot 2 */}
      <div className="p-4 border-t border-[#302B3D]/60 bg-[#100F17]/80 backdrop-blur-sm">
        <form
          onSubmit={handleSend}
          className="max-w-3xl mx-auto relative bg-[#171521] border border-[#302B3D] focus-within:border-[#A78BFA] rounded-xl flex items-center px-4 py-2 transition-all shadow-sm"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your documents..."
            className="flex-1 bg-transparent text-sm text-[#F5F3FA] placeholder-[#6B657A] outline-none resize-none max-h-36 py-1"
          />

          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="p-2 rounded-lg bg-[#F5B544] hover:bg-[#E9A72D] text-[#0B0A10] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ml-2 flex-shrink-0"
            title="Send question"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#0B0A10]" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>

      {/* Citation Inspector Modal */}
      {selectedCitation && (
        <Modal
          isOpen={!!selectedCitation}
          onClose={() => setSelectedCitation(null)}
          title="Source Citation Reference"
          subtitle={`Document Page ${selectedCitation.page_number || 1} • Similarity: ${Math.round(selectedCitation.score * 100)}%`}
          maxWidth="md"
        >
          <div className="flex flex-col gap-4 text-xs">
            <div className="bg-[#100F17] p-3 rounded-lg border border-[#302B3D]">
              <span className="text-[11px] text-[#A6A0B5] uppercase font-semibold block mb-1">
                Referenced Excerpt
              </span>
              <p className="text-sm text-[#F5F3FA] leading-relaxed whitespace-pre-wrap">
                {selectedCitation.snippet}
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedCitation(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
