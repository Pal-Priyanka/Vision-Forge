import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, AlertCircle, Files, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadedImage {
    id: string;
    file: File;
    preview: string;
}

interface ImageUploaderProps {
    onImagesSelect: (images: UploadedImage[]) => void;
    maxSizeMB?: number;
    maxFiles?: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
    onImagesSelect,
    maxSizeMB = 10,
    maxFiles = 10
}) => {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
        setError(null);

        if (rejectedFiles.length > 0) {
            const rejection = rejectedFiles[0];
            if (rejection.errors[0]?.code === 'file-too-large') {
                setError(`File too large. Maximum size is ${maxSizeMB}MB.`);
            } else if (rejection.errors[0]?.code === 'too-many-files') {
                setError(`Too many files. Maximum is ${maxFiles}.`);
            } else {
                setError('Invalid file format. Please upload JPG or PNG.');
            }
            return;
        }

        const newImages: UploadedImage[] = [];
        let processed = 0;

        acceptedFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                newImages.push({
                    id: Math.random().toString(36).substr(2, 9),
                    file,
                    preview: reader.result as string
                });
                processed++;
                if (processed === acceptedFiles.length) {
                    const updated = [...images, ...newImages].slice(0, maxFiles);
                    setImages(updated);
                    onImagesSelect(updated);
                }
            };
            reader.readAsDataURL(file);
        });
    }, [images, onImagesSelect, maxSizeMB, maxFiles]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png']
        },
        maxSize: maxSizeMB * 1024 * 1024,
        maxFiles: maxFiles,
        multiple: true
    });

    const removeImage = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = images.filter(img => img.id !== id);
        setImages(updated);
        onImagesSelect(updated);
    };

    const clearAll = () => {
        setImages([]);
        onImagesSelect([]);
    };

    return (
        <div className="w-full space-y-6">
            <div
                {...getRootProps()}
                className={`relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${isDragActive
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-white/10 hover:border-primary/40 hover:bg-white/5'
                    }`}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isDragActive ? 'bg-primary text-white' : 'bg-white/5 text-text-secondary'
                        }`}>
                        {isDragActive ? <Upload size={28} /> : <Files size={28} />}
                    </div>
                    <div>
                        <p className="text-md font-bold mb-1">
                            {isDragActive ? 'Drop images here' : 'Drag & drop images'}
                        </p>
                        <p className="text-[10px] text-text-secondary uppercase tracking-widest">
                            {images.length} / {maxFiles} selected • JPG, PNG • Max {maxSizeMB}MB
                        </p>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {images.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-widest text-text-secondary">Selected Images</h3>
                            <button
                                onClick={clearAll}
                                className="text-[10px] uppercase tracking-widest font-black text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                            >
                                <Trash2 size={12} /> Clear All
                            </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {images.map((img) => (
                                <motion.div
                                    key={img.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="relative aspect-square rounded-2xl overflow-hidden group border border-white/10"
                                >
                                    <img
                                        src={img.preview}
                                        alt="Preview"
                                        className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <button
                                        onClick={(e) => removeImage(img.id, e)}
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/80"
                                    >
                                        <X size={14} className="text-white" />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
                >
                    <AlertCircle size={18} className="text-red-400" />
                    <p className="text-xs text-red-400 font-bold">{error}</p>
                </motion.div>
            )}
        </div>
    );
};

export default ImageUploader;

