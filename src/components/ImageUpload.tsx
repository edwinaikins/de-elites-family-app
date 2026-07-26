import React, { useState, useRef } from 'react';
import { UploadCloud, Check, AlertCircle, Trash2 } from 'lucide-react';

interface ImageUploadProps {
  id?: string;
  value: string;
  onChange: (base64: string) => void;
  label: string;
  description?: string;
  aspectRatio?: 'avatar' | 'banner' | 'video' | 'any';
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  id,
  value,
  onChange,
  label,
  description = "PNG, JPG or WEBP up to 5MB. Saved directly in database.",
  aspectRatio = 'any'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("Invalid file type. Please upload an image.");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError("File is too large. Maximum size is 5MB.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result);
      }
    };
    reader.onerror = () => {
      setError("Error reading file.");
    };
    reader.readAsDataURL(file);
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
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  // Determine container dimensions based on preferred ratio
  const getRatioClass = () => {
    switch (aspectRatio) {
      case 'avatar':
        return 'w-24 h-24 rounded-full';
      case 'banner':
        return 'w-full aspect-[21/9] rounded-lg';
      case 'video':
        return 'w-full aspect-[16/9] rounded-lg';
      default:
        return 'w-full aspect-[4/3] rounded-lg';
    }
  };

  return (
    <div id={id} className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="text-red-400 hover:text-red-300 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" /> Clear Image
          </button>
        )}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer transition-all border rounded-lg p-5 flex flex-col items-center justify-center text-center gap-3 overflow-hidden ${
          isDragging
            ? 'border-luxury-gold bg-luxury-gold/5 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
            : value 
              ? 'border-gray-800 bg-jet-black/30 hover:border-gray-700'
              : 'border-dashed border-gray-800 bg-jet-black hover:border-luxury-gold/50 hover:bg-luxury-gold/[0.02]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {value ? (
          // Preview state
          <div className="w-full flex flex-col items-center gap-4">
            <div className={`relative overflow-hidden border border-gray-850 shadow-inner flex items-center justify-center bg-black ${getRatioClass()}`}>
              <img
                src={value}
                alt={label}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <UploadCloud className="w-8 h-8 text-luxury-gold animate-bounce" />
              </div>
            </div>
            
            <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-green-500" />
              Photo Loaded (Click to Change)
            </div>
          </div>
        ) : (
          // Upload state
          <>
            <div className="w-12 h-12 rounded-full border border-gray-850 bg-charcoal-card flex items-center justify-center text-gray-400 group-hover:text-luxury-gold group-hover:border-luxury-gold/30 transition-all">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="font-display text-[10px] font-black text-white uppercase tracking-wider">
                {isDragging ? "DROP THE IMAGE NOW" : "DRAG & DROP IMAGE OR CLICK TO BROWSE"}
              </p>
              <p className="text-[9px] text-gray-500 font-sans">
                {description}
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-sans mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
