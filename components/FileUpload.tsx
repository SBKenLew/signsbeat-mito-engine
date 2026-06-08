"use client";

import { useRef, useState } from "react";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  loading: boolean;
}

export default function FileUpload({ onFilesSelected, loading }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    setSelectedFiles(arr);
    onFilesSelected(arr);
  }

  return (
    <div className="w-full flex flex-col gap-3">
      <div
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer
          ${dragging ? "border-violet-400 bg-violet-500/10" : "border-white/20 bg-white/5 hover:bg-white/10"}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".csv,.pdf,.json"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <svg className="w-10 h-10 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <p className="text-white/70 text-sm font-medium">
            {loading ? "Analysing…" : "Drop files here or click to upload"}
          </p>
          <p className="text-white/30 text-xs">CSV · PDF · JSON — multiple files supported</p>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <ul className="flex flex-col gap-1">
          {selectedFiles.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-white/60 bg-white/5 rounded-xl px-3 py-2">
              <span className="w-5 h-5 rounded-md bg-violet-500/30 flex items-center justify-center text-xs text-violet-300 font-bold">
                {f.name.split(".").pop()?.toUpperCase().slice(0, 3)}
              </span>
              <span className="truncate flex-1">{f.name}</span>
              <span className="text-white/30">{(f.size / 1024).toFixed(1)} KB</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
