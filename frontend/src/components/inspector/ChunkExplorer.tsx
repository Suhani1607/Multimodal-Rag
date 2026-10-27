import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  FileText,
  Table as TableIcon,
  Image as ImageIcon,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { DocumentChunk } from '../../types';
import { Badge } from '../common/Badge';

interface ChunkExplorerProps {
  documentName: string;
  chunks: DocumentChunk[];
  isLoading: boolean;
  onRefresh?: () => void;
}

export const ChunkExplorer: React.FC<ChunkExplorerProps> = ({
  documentName,
  chunks,
  isLoading,
  onRefresh,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'text' | 'table' | 'image'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(
    chunks.length > 0 ? chunks[0].chunk_id : null
  );
  const [copied, setCopied] = useState(false);

  // Auto-select first chunk when chunks load
  useEffect(() => {
    if ((!selectedChunkId || !chunks.find((c) => c.chunk_id === selectedChunkId)) && chunks.length > 0) {
      setSelectedChunkId(chunks[0].chunk_id);
    }
  }, [chunks, selectedChunkId]);

  // Filter chunks
  const filteredChunks = chunks.filter((c) => {
    const matchesType =
      filterType === 'all' ||
      (filterType === 'text' && c.element_type === 'text') ||
      (filterType === 'table' && (c.element_type === 'table' || (c.tables_html && c.tables_html.length > 0))) ||
      (filterType === 'image' && (c.element_type === 'image' || (c.images_base64 && c.images_base64.length > 0)));

    const matchesSearch =
      !searchQuery.trim() ||
      c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.section_title && c.section_title.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesType && matchesSearch;
  });

  const selectedChunk =
    chunks.find((c) => c.chunk_id === selectedChunkId) || filteredChunks[0] || null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0A10] text-[#F5F3FA] rounded-lg overflow-hidden">
      {/* Top Filter and Search Bar */}
      <div className="p-4 border-b border-[#302B3D] bg-[#100F17] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{documentName}</span>
          <Badge variant="violet" size="sm">
            {chunks.length} chunks indexed
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {/* Content Type Filter Chips */}
          <div className="flex items-center gap-1 bg-[#171521] p-1 rounded-lg border border-[#302B3D]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-[#A78BFA] text-[#0B0A10]'
                  : 'text-[#A6A0B5] hover:text-[#F5F3FA]'
              }`}
            >
              All ({chunks.length})
            </button>
            <button
              onClick={() => setFilterType('text')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                filterType === 'text'
                  ? 'bg-[#A78BFA] text-[#0B0A10]'
                  : 'text-[#A6A0B5] hover:text-[#F5F3FA]'
              }`}
            >
              <FileText className="w-3 h-3" />
              Text
            </button>
            <button
              onClick={() => setFilterType('table')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                filterType === 'table'
                  ? 'bg-[#A78BFA] text-[#0B0A10]'
                  : 'text-[#A6A0B5] hover:text-[#F5F3FA]'
              }`}
            >
              <TableIcon className="w-3 h-3" />
              Tables
            </button>
            <button
              onClick={() => setFilterType('image')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                filterType === 'image'
                  ? 'bg-[#A78BFA] text-[#0B0A10]'
                  : 'text-[#A6A0B5] hover:text-[#F5F3FA]'
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              Images
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#6B657A] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search in chunks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#171521] border border-[#302B3D] text-xs text-[#F5F3FA] placeholder-[#6B657A] rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-[#A78BFA] w-48"
            />
          </div>
        </div>
      </div>

      {/* Main split view: Chunk List + Chunk Inspector */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chunk Cards List */}
        <div className="w-1/2 border-r border-[#302B3D] overflow-y-auto p-4 flex flex-col gap-2.5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#A6A0B5] gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#60A5FA]" />
              <span className="text-xs">Loading document chunks, tables & figures...</span>
            </div>
          ) : filteredChunks.length === 0 ? (
            <div className="text-center py-16 text-[#6B657A] text-xs flex flex-col items-center gap-3">
              <p>No chunks match your current filter or search criteria.</p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="px-3 py-1.5 rounded-lg bg-[#1E1C29] border border-[#353046] text-[#60A5FA] hover:bg-[#252233] text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reload Chunks
                </button>
              )}
            </div>
          ) : (
            filteredChunks.map((chunk) => {
              const isSelected = selectedChunk?.chunk_id === chunk.chunk_id;
              const hasTable = chunk.tables_html && chunk.tables_html.length > 0;
              const hasImage = chunk.images_base64 && chunk.images_base64.length > 0;

              return (
                <div
                  key={chunk.chunk_id}
                  onClick={() => setSelectedChunkId(chunk.chunk_id)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-[#201D2B] border-[#A78BFA] shadow-glow-violet'
                      : 'bg-[#171521] border-[#302B3D] hover:border-[#4A435C]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#A78BFA]">
                        #{chunk.sequence}
                      </span>
                      <span className="text-xs text-[#A6A0B5]">
                        Page {chunk.page_number}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {hasTable && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#93C5FD]/10 text-[#93C5FD] border border-[#93C5FD]/30">
                          Table
                        </span>
                      )}
                      {hasImage && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/30">
                          Image
                        </span>
                      )}
                      <span className="text-[11px] text-[#6B657A]">
                        {chunk.content.length} chars
                      </span>
                    </div>
                  </div>

                  {chunk.section_title && (
                    <p className="text-xs font-medium text-[#F5F3FA] mb-1 line-clamp-1">
                      {chunk.section_title}
                    </p>
                  )}

                  <p className="text-xs text-[#A6A0B5] line-clamp-3 leading-relaxed">
                    {chunk.content}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Detailed Chunk Inspector */}
        <div className="w-1/2 overflow-y-auto p-5 bg-[#100F17]/40 flex flex-col gap-4">
          {selectedChunk ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-[#302B3D]">
                <div>
                  <h4 className="text-sm font-semibold text-[#F5F3FA]">
                    Chunk #{selectedChunk.sequence} Inspector
                  </h4>
                  <p className="text-xs text-[#A6A0B5]">
                    Page {selectedChunk.page_number} • {selectedChunk.content.length} characters
                  </p>
                </div>

                <button
                  onClick={() => handleCopy(selectedChunk.content)}
                  className="p-1.5 rounded-lg bg-[#171521] border border-[#302B3D] text-[#A6A0B5] hover:text-[#F5F3FA] hover:border-[#A78BFA] transition-colors flex items-center gap-1.5 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy text
                    </>
                  )}
                </button>
              </div>

              {/* Section title */}
              {selectedChunk.section_title && (
                <div className="bg-[#171521] border border-[#302B3D] p-3 rounded-lg">
                  <span className="text-[11px] uppercase tracking-wider text-[#A78BFA] font-semibold block mb-1">
                    Section Heading
                  </span>
                  <p className="text-xs font-medium text-[#F5F3FA]">
                    {selectedChunk.section_title}
                  </p>
                </div>
              )}

              {/* Extracted Images Preview */}
              {selectedChunk.images_base64 && selectedChunk.images_base64.length > 0 && (
                <div className="bg-[#171521] border border-[#302B3D] p-3.5 rounded-lg">
                  <span className="text-[11px] uppercase tracking-wider text-[#FBBF24] font-semibold flex items-center gap-1.5 mb-2">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Extracted Visual Figure ({selectedChunk.images_base64.length})
                  </span>
                  <div className="flex flex-col gap-3">
                    {selectedChunk.images_base64.map((imgB64, idx) => (
                      <div key={idx} className="rounded-lg overflow-hidden border border-[#302B3D] bg-black">
                        <img
                          src={`data:image/jpeg;base64,${imgB64}`}
                          alt={`Extracted figure ${idx + 1}`}
                          className="max-h-72 w-full object-contain mx-auto"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rendered HTML Tables */}
              {selectedChunk.tables_html && selectedChunk.tables_html.length > 0 && (
                <div className="bg-[#171521] border border-[#302B3D] p-3.5 rounded-lg">
                  <span className="text-[11px] uppercase tracking-wider text-[#93C5FD] font-semibold flex items-center gap-1.5 mb-2">
                    <TableIcon className="w-3.5 h-3.5" />
                    Structured Table ({selectedChunk.tables_html.length})
                  </span>
                  <div className="overflow-x-auto space-y-3">
                    {selectedChunk.tables_html.map((tblHtml, idx) => (
                      <div
                        key={idx}
                        className="text-xs prose prose-invert max-w-none [&_table]:border-collapse [&_th]:border [&_th]:border-[#302B3D] [&_th]:p-2 [&_th]:bg-[#201D2B] [&_td]:border [&_td]:border-[#302B3D] [&_td]:p-2"
                        dangerouslySetInnerHTML={{ __html: tblHtml }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Text Content */}
              <div className="bg-[#171521] border border-[#302B3D] p-3.5 rounded-lg">
                <span className="text-[11px] uppercase tracking-wider text-[#A6A0B5] font-semibold block mb-2">
                  Extracted Text
                </span>
                <p className="text-xs text-[#F5F3FA] leading-relaxed whitespace-pre-wrap font-mono">
                  {selectedChunk.content}
                </p>
              </div>

              {/* AI Enhanced Retrieval Description */}
              {selectedChunk.enhanced_content && selectedChunk.enhanced_content !== selectedChunk.content && (
                <div className="bg-[#A78BFA]/5 border border-[#A78BFA]/20 p-3.5 rounded-lg">
                  <span className="text-[11px] uppercase tracking-wider text-[#A78BFA] font-semibold block mb-2">
                    AI-Enhanced Searchable Representation (Groq)
                  </span>
                  <p className="text-xs text-[#C4B5FD] leading-relaxed whitespace-pre-wrap">
                    {selectedChunk.enhanced_content}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-[#6B657A] text-xs">
              Select a chunk to inspect details, tables, and images.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
