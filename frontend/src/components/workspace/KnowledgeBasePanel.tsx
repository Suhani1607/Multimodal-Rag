import React, { useState, useRef } from 'react';
import {
  FileText,
  Settings,
  UploadCloud,
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Loader2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { DocumentSource } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface KnowledgeBasePanelProps {
  documents: DocumentSource[];
  onUploadFile: (file: File) => Promise<void>;
  onIngestUrl: (url: string) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onSelectDocument: (doc: DocumentSource) => void;
  isUploading: boolean;
}

export const KnowledgeBasePanel: React.FC<KnowledgeBasePanelProps> = ({
  documents,
  onUploadFile,
  onIngestUrl,
  onDeleteDocument,
  onSelectDocument,
  isUploading,
}) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'settings'>('documents');
  const [urlInput, setUrlInput] = useState('');
  const [isUrlSubmitting, setIsUrlSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await onUploadFile(e.target.files[0]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await onUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    try {
      setIsUrlSubmitting(true);
      await onIngestUrl(urlInput.trim());
      setUrlInput('');
    } finally {
      setIsUrlSubmitting(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <aside className="w-80 md:w-96 h-full bg-[#100F17] border-l border-[#302B3D] flex flex-col flex-shrink-0 select-none">
      {/* Panel Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#302B3D]/60">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#A78BFA]" />
          <h2 className="text-sm font-semibold text-[#F5F3FA]">Knowledge Base</h2>
        </div>
        <span className="text-xs text-[#A6A0B5] bg-[#171521] px-2 py-0.5 rounded-full border border-[#302B3D]">
          {documents.length} sources
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#302B3D]/60 bg-[#0B0A10]/40 px-3 pt-2">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'documents'
              ? 'border-[#A78BFA] text-[#F5F3FA]'
              : 'border-transparent text-[#A6A0B5] hover:text-[#F5F3FA]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Documents
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'settings'
              ? 'border-[#A78BFA] text-[#F5F3FA]'
              : 'border-transparent text-[#A6A0B5] hover:text-[#F5F3FA]'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {activeTab === 'documents' ? (
          <>
            {/* Add Sources Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-[#A6A0B5] uppercase tracking-wider">
                Add Sources
              </h3>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 ${
                  dragOver
                    ? 'border-[#A78BFA] bg-[#A78BFA]/10'
                    : 'border-[#302B3D] hover:border-[#4A435C] bg-[#171521]/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {isUploading ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Loader2 className="w-6 h-6 text-[#A78BFA] animate-spin" />
                    <p className="text-xs text-[#F5F3FA] font-medium">Uploading and queued...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-[#201D2B] border border-[#302B3D] flex items-center justify-center text-[#A6A0B5] mb-2">
                      <UploadCloud className="w-5 h-5 text-[#A78BFA]" />
                    </div>
                    <p className="text-xs font-medium text-[#F5F3FA]">
                      Drop files or <span className="text-[#A78BFA]">click to upload</span>
                    </p>
                    <p className="text-[11px] text-[#6B657A] mt-1">
                      PDF, DOCX, CSV • Max 50MB
                    </p>
                  </>
                )}
              </div>

              {/* OR Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-[#302B3D]/60" />
                <span className="text-[10px] text-[#6B657A] uppercase font-bold tracking-wider">
                  OR
                </span>
                <div className="flex-1 h-px bg-[#302B3D]/60" />
              </div>

              {/* Website URL Input */}
              <form onSubmit={handleUrlSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="w-3.5 h-3.5 text-[#6B657A] absolute left-3 top-3" />
                  <input
                    type="url"
                    placeholder="Paste website URL"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full bg-[#171521] border border-[#302B3D] text-xs text-[#F5F3FA] placeholder-[#6B657A] rounded-lg pl-8 pr-3 py-2 outline-none focus:border-[#A78BFA]"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  isLoading={isUrlSubmitting}
                  disabled={!urlInput.trim()}
                  className="px-3"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </form>
            </div>

            {/* Sources List Section */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#302B3D]/60">
              <h3 className="text-xs font-semibold text-[#A6A0B5] uppercase tracking-wider">
                Sources
              </h3>

              {documents.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#6B657A]">
                  No sources added yet
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => onSelectDocument(doc)}
                      className="group bg-[#171521] border border-[#302B3D] hover:border-[#A78BFA]/40 rounded-lg p-3 transition-all duration-150 cursor-pointer flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded bg-[#201D2B] border border-[#302B3D] flex items-center justify-center text-[#A78BFA] flex-shrink-0 mt-0.5">
                            {doc.mimeType?.includes('html') ? (
                              <Globe className="w-3.5 h-3.5" />
                            ) : (
                              <FileText className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#F5F3FA] truncate group-hover:text-[#A78BFA] transition-colors">
                              {doc.filename}
                            </p>
                            <p className="text-[11px] text-[#6B657A]">
                              {formatFileSize(doc.sizeBytes)}
                              {doc.chunksCount ? ` • ${doc.chunksCount} chunks` : ''}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove ${doc.filename}?`)) {
                              onDeleteDocument(doc.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#6B657A] hover:text-[#FB7185] transition-all rounded"
                          title="Remove source"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Status indicator row */}
                      <div className="flex items-center justify-between pt-1 border-t border-[#302B3D]/30 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {doc.status === 'COMPLETED' ? (
                            <span className="flex items-center gap-1 text-[#4ADE80]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Ready
                            </span>
                          ) : doc.status === 'FAILED' ? (
                            <span className="flex items-center gap-1 text-[#FB7185]">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Failed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[#FBBF24] animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              Processing
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-[#A78BFA] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          Inspect
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Settings Tab */
          <div className="flex flex-col gap-4 text-xs text-[#A6A0B5]">
            <div>
              <label className="font-semibold text-[#F5F3FA] block mb-1">
                Chunk Size (chars)
              </label>
              <input
                type="number"
                defaultValue={3000}
                className="w-full bg-[#171521] border border-[#302B3D] text-[#F5F3FA] rounded-lg p-2 text-xs"
                disabled
              />
              <span className="text-[11px] text-[#6B657A] mt-1 block">
                Target characters per structured element chunk.
              </span>
            </div>

            <div>
              <label className="font-semibold text-[#F5F3FA] block mb-1">
                Embedding Model
              </label>
              <div className="bg-[#171521] border border-[#302B3D] p-2.5 rounded-lg text-xs text-[#F5F3FA]">
                sentence-transformers/all-MiniLM-L6-v2 (384d)
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#F5F3FA] block mb-1">
                Groq LLM Model
              </label>
              <div className="bg-[#171521] border border-[#302B3D] p-2.5 rounded-lg text-xs text-[#F5F3FA]">
                openai/gpt-oss-20b (Fallback: llama-3.3-70b-versatile)
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#F5F3FA] block mb-1">
                Vector Similarity Space
              </label>
              <div className="bg-[#171521] border border-[#302B3D] p-2.5 rounded-lg text-xs text-[#A78BFA]">
                PostgreSQL pgvector (Cosine distance)
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
