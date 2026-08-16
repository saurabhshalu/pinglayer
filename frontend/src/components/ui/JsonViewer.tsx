import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Code } from 'lucide-react';
import { copyToClipboard } from '../../lib/utils';

export interface JsonViewerProps {
  data: any;
  title?: string;
  defaultOpen?: boolean;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  title = 'Raw JSON Payload',
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(jsonString);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return <span className="text-xs text-slate-500 italic">None</span>;
  }

  return (
    <div className="w-full max-w-full min-w-0 rounded-lg border border-slate-800 bg-slate-950 overflow-hidden text-xs">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-900 cursor-pointer transition-colors select-none min-w-0"
      >
        <div className="flex items-center gap-2 text-slate-300 font-medium min-w-0">
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
          <Code className="w-3.5 h-3.5 text-[#BDD2B6] flex-shrink-0" />
          <span className="truncate">{title}</span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex-shrink-0 ml-2"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {isOpen && (
        <div className="p-3 sm:p-3.5 overflow-x-auto max-h-96 border-t border-slate-800/80 bg-slate-950 min-w-0 max-w-full">
          <pre className="font-mono text-xs text-[#F8EDE3]/90 leading-relaxed break-all whitespace-pre-wrap max-w-full">
            {jsonString}
          </pre>
        </div>
      )}
    </div>
  );
};
