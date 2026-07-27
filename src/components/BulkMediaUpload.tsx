import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2, AlertCircle, Film, Image as ImageIcon } from 'lucide-react';
import { uploadGalleryMedia, UploadedMediaItem } from '../lib/cmsClient';

interface BulkMediaUploadProps {
  onUploaded: (items: UploadedMediaItem[]) => void;
}

const MAX_FILE_BYTES = 150 * 1024 * 1024;

export const BulkMediaUpload: React.FC<BulkMediaUploadProps> = ({ onUploaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    const tooLarge = files.filter((f) => f.size > MAX_FILE_BYTES);
    if (tooLarge.length) {
      setError(`${tooLarge.map((f) => f.name).join(', ')} exceed(s) the 150MB per-file limit.`);
      return;
    }

    setError(null);
    setUploading(true);
    setProgressLabel(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`);
    try {
      const results = await uploadGalleryMedia(files);
      onUploaded(results);
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      setProgressLabel('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative group cursor-pointer transition-all border rounded-lg p-6 flex flex-col items-center justify-center text-center gap-3 ${
          isDragging
            ? 'border-luxury-gold bg-luxury-gold/5 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
            : 'border-dashed border-gray-800 bg-jet-black hover:border-luxury-gold/50 hover:bg-luxury-gold/[0.02]'
        } ${uploading ? 'opacity-70 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="w-12 h-12 rounded-full border border-gray-850 bg-charcoal-card flex items-center justify-center text-gray-400 group-hover:text-luxury-gold group-hover:border-luxury-gold/30 transition-all">
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-luxury-gold" />
          ) : (
            <UploadCloud className="w-6 h-6" />
          )}
        </div>

        <div className="space-y-1">
          <p className="font-display text-[10px] font-black text-white uppercase tracking-wider">
            {uploading ? progressLabel : isDragging ? 'DROP FILES NOW' : 'DRAG & DROP EVENT PHOTOS / VIDEOS, OR CLICK TO BROWSE'}
          </p>
          <p className="text-[9px] text-gray-500 font-sans flex items-center justify-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Photos</span>
            <span className="flex items-center gap-1"><Film className="w-3 h-3" /> Videos</span>
            <span>up to 150MB each · select multiple at once</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-sans">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
