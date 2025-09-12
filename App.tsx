
import React, { useState, useCallback, useEffect, useRef, forwardRef } from 'react';
import { solveLimitFromImage } from './services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';


// --- Type Definitions ---

interface HistoryEntry {
  id: number;
  imageData: { base64: string; mimeType: string };
  problemSnippet: string;
  fullSolution: string;
}

// --- Helper Functions & Components ---

const fileToUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        resolve(URL.createObjectURL(file));
    });
};

const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop, mimeType: string): Promise<{ base64: string; url: string }> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Could not get canvas context');
        }

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = crop.width * pixelRatio;
        canvas.height = crop.height * pixelRatio;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            crop.width * scaleX,
            crop.height * scaleY,
            0,
            0,
            crop.width,
            crop.height
        );
        
        const base64 = canvas.toDataURL(mimeType).split(',')[1];
        canvas.toBlob((blob) => {
            if (!blob) {
                console.error('Canvas is empty');
                return;
            }
            const url = URL.createObjectURL(blob);
            resolve({ base64, url });
        }, mimeType, 1);
    });
};


const Loader: React.FC = () => (
  <div className="flex flex-col items-center justify-center space-y-2">
    <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="text-blue-600 dark:text-blue-400">កំពុងគណនា... សូមរង់ចាំបន្តិច</p>
  </div>
);

// --- Icon Components ---

const UploadIcon: React.FC = () => (
    <svg className="w-12 h-12 mx-auto text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const MoonIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
    </svg>
);

const SunIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M12 2v2"></path>
        <path d="M12 20v2"></path>
        <path d="m4.93 4.93 1.41 1.41"></path>
        <path d="m17.66 17.66 1.41 1.41"></path>
        <path d="M2 12h2"></path>
        <path d="M20 12h2"></path>
        <path d="m6.34 17.66-1.41 1.41"></path>
        <path d="m19.07 4.93-1.41 1.41"></path>
    </svg>
);

const CopyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
    </svg>
);

const CheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M20 6 9 17l-5-5"></path>
    </svg>
);

const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

const HistoryIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

// --- UI Components ---

interface ThemeToggleProps {
    theme: 'light' | 'dark';
    onToggle: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => (
    <button
        onClick={onToggle}
        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 focus:ring-blue-500 transition-colors"
        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
        {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
    </button>
);

const ImageGuidelines: React.FC = () => (
    <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p className="font-semibold text-center mb-2">💡 គន្លឹះដើម្បីទទួលបានលទ្ធផលល្អបំផុត៖</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-left max-w-md mx-auto">
            <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                <span>ពន្លឺគ្រប់គ្រាន់ និងច្បាស់</span>
            </li>
            <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                <span>គ្មានស្រមោល ឬពន្លឺចាំង</span>
            </li>
            <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                <span>រូបថតចំលំហាត់</span>
            </li>
             <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                <span>អក្សរដែលសរសេរច្បាស់ៗ</span>
            </li>
        </ul>
    </div>
);

interface ImageUploaderProps {
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSolve: () => void;
  imageUrl: string | null;
  isLoading: boolean;
  hasImage: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageChange, onSolve, imageUrl, isLoading, hasImage }) => (
    <div className="w-full max-w-2xl mx-auto">
        <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors duration-300 flex justify-center items-center h-64 p-4 text-center">
            {imageUrl ? (
                <img src={imageUrl} alt="ការបង្ហាញរូបភាពលីមីត" className="max-h-full max-w-full object-contain rounded-md" />
            ) : (
                <div className="flex flex-col items-center">
                    <UploadIcon />
                    <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-gray-100">
                        អូសរូបភាពមកដាក់ទីនេះ ឬ <span className="text-blue-600 dark:text-blue-400">ចុចដើម្បីជ្រើសរើស</span>
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ប្រភេទរូបភាព PNG, JPG, WEBP</p>
                </div>
            )}
            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={onImageChange} accept="image/png, image/jpeg, image/webp" disabled={isLoading} />
        </label>
        <ImageGuidelines />
        <div className="mt-6 flex justify-center">
            <button
                onClick={onSolve}
                disabled={!hasImage || isLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center px-12 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105"
            >
                ដោះស្រាយ
            </button>
        </div>
    </div>
);


interface SolutionDisplayProps {
    solution: string | null;
    isLoading: boolean;
    error: string | null;
    onCopy: () => void;
    isCopied: boolean;
}

const SolutionDisplay = forwardRef<HTMLDivElement, SolutionDisplayProps>(({ solution, isLoading, error, onCopy, isCopied }, ref) => {
    if (isLoading) {
        return <div className="mt-8"><Loader /></div>;
    }

    if (error) {
        return (
            <div className="mt-8 w-full max-w-3xl mx-auto bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-4 rounded-md">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!solution) {
        return null;
    }

    return (
        <div className="mt-8 w-full max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">ចម្លើយលម្អិត</h2>
                <button
                    onClick={onCopy}
                    disabled={isCopied}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors duration-200 disabled:cursor-not-allowed
                               bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600
                               disabled:bg-green-100 disabled:text-green-800 dark:disabled:bg-green-900/50 dark:disabled:text-green-300"
                    aria-label={isCopied ? 'Solution copied' : 'Copy solution'}
                >
                    {isCopied ? (
                        <>
                            <CheckIcon className="h-5 w-5 mr-2" />
                            <span>បានចម្លង</span>
                        </>
                    ) : (
                        <>
                            <CopyIcon className="h-5 w-5 mr-2" />
                            <span>ចម្លង</span>
                        </>
                    )}
                </button>
            </div>
            <div ref={ref} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="markdown-content text-gray-800 dark:text-gray-200 leading-relaxed">
                    <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            p: ({node, ...props}) => <p className="mb-4" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 pl-4 space-y-2" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 pl-4 space-y-2" {...props} />,
                            // FIX: Cast props to `any` to resolve a TypeScript error where the `inline` property is not recognized.
                            // This is a common issue with `react-markdown` version updates and type mismatches.
                            code: ({node, inline, className, children, ...props}: any) => {
                                return !inline ? (
                                  <pre className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-md overflow-x-auto my-4 font-mono text-sm"><code className={className} {...props}>{children}</code></pre>
                                ) : (
                                  <code className="bg-gray-200 dark:bg-gray-700 rounded-sm px-1.5 py-1 font-mono text-sm" {...props}>
                                    {children}
                                  </code>
                                )
                            },
                            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                            h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-3 border-b pb-2" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
                        }}
                    >
                        {solution}
                    </ReactMarkdown>
                 </div>
            </div>
        </div>
    );
});


interface HistorySectionProps {
    history: HistoryEntry[];
    onSelect: (entry: HistoryEntry) => void;
    onClear: () => void;
    onDelete: (id: number) => void;
}

const HistorySection: React.FC<HistorySectionProps> = ({ history, onSelect, onClear, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (history.length === 0) {
        return null;
    }

    return (
        <section className="mt-12 w-full max-w-3xl mx-auto">
            <div className="bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
                <button
                    className="w-full flex justify-between items-center p-4 sm:p-5 text-left font-bold text-lg text-gray-800 dark:text-gray-100"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                    aria-controls="history-panel"
                >
                    <div className="flex items-center">
                        <HistoryIcon className="h-6 w-6 mr-3" />
                        <span>ប្រវត្តិ</span>
                    </div>
                    <ChevronDownIcon className={`h-6 w-6 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                    <div id="history-panel" className="p-4 sm:p-5 border-t border-gray-200 dark:border-gray-700">
                        {history.length > 0 ? (
                            <>
                                <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {history.map((entry) => (
                                        <li key={entry.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                                            <button onClick={() => onSelect(entry)} className="flex items-center space-x-4 text-left flex-grow truncate">
                                                <img
                                                    src={`data:${entry.imageData.mimeType};base64,${entry.imageData.base64}`}
                                                    alt="Problem thumbnail"
                                                    className="w-16 h-16 object-cover rounded-md border border-gray-200 dark:border-gray-600 flex-shrink-0"
                                                />
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                                    {entry.problemSnippet}
                                                </p>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                                                className="ml-4 p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity"
                                                aria-label="Delete entry"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-4 text-right">
                                    <button onClick={onClear} className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium">
                                        លុបប្រវត្តិទាំងអស់។
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-4">គ្មានប្រវត្តិ</p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};


interface ImageCropModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    imageSrc: string | null;
    crop: Crop | undefined;
    setCrop: (crop: Crop) => void;
    setCompletedCrop: React.Dispatch<React.SetStateAction<PixelCrop | undefined>>;
    imageRef: React.RefObject<HTMLImageElement>;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({ isOpen, onClose, onConfirm, imageSrc, crop, setCrop, setCompletedCrop, imageRef }) => {
    if (!isOpen) return null;

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const newCrop = centerCrop(
            makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
            width,
            height
        );
        setCrop(newCrop);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="crop-dialog-title">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <h2 id="crop-dialog-title" className="text-xl font-bold p-4 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                    កាត់រូបភាព
                </h2>
                <div className="flex-grow p-4 overflow-auto flex items-center justify-center">
                    {imageSrc && (
                        <ReactCrop
                            crop={crop}
                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={undefined} // Free crop
                        >
                            <img
                                ref={imageRef}
                                src={imageSrc}
                                alt="Crop preview"
                                onLoad={onImageLoad}
                                className="max-w-full max-h-[65vh] object-contain"
                            />
                        </ReactCrop>
                    )}
                </div>
                <div className="flex justify-end items-center p-4 border-t border-gray-200 dark:border-gray-700 space-x-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                        បោះបង់
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-6 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        បញ្ជាក់
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---

export default function App() {
    // Image and Solution State
    const [imageBase64, setImageBase64] = useState<{ base64: string; mimeType: string } | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [solution, setSolution] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState<boolean>(false);
    
    // History State
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    
    // Cropper State
    const [uncroppedImageUrl, setUncroppedImageUrl] = useState<string | null>(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [originalMimeType, setOriginalMimeType] = useState<string | null>(null);
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

    // Refs
    const solutionRef = useRef<HTMLDivElement>(null);
    const cropImageRef = useRef<HTMLImageElement>(null);

    // Theme State
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
        }
        return 'light';
    });

    // --- Effects ---

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
      try {
        const storedHistory = localStorage.getItem('limitSolverHistory');
        if (storedHistory) setHistory(JSON.parse(storedHistory));
      } catch (error) {
        console.error("Failed to load history from localStorage:", error);
        setHistory([]);
      }
    }, []);

    useEffect(() => {
      try {
        localStorage.setItem('limitSolverHistory', JSON.stringify(history));
      } catch (error) {
        console.error("Failed to save history to localStorage:", error);
      }
    }, [history]);

    // --- Handlers ---

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const handleImageChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Revoke previous URLs to prevent memory leaks
            if (imageUrl) URL.revokeObjectURL(imageUrl);
            if (uncroppedImageUrl) URL.revokeObjectURL(uncroppedImageUrl);
            
            setSolution(null);
            setError(null);
            setIsCopied(false);
            setImageUrl(null);
            setImageBase64(null);

            setOriginalMimeType(file.type);
            const url = await fileToUrl(file);
            setUncroppedImageUrl(url);
            setIsCropperOpen(true);
        }
        // Reset the input value to allow re-uploading the same file
        event.target.value = '';
    }, [imageUrl, uncroppedImageUrl]);

    const handleCropConfirm = useCallback(async () => {
        if (!completedCrop || !cropImageRef.current || !originalMimeType) return;
        
        try {
            const croppedImageData = await getCroppedImg(cropImageRef.current, completedCrop, originalMimeType);
            setImageBase64({ base64: croppedImageData.base64, mimeType: originalMimeType });
            setImageUrl(croppedImageData.url);
        } catch (e) {
            console.error("Cropping failed", e);
            setError("Could not crop the image. Please try again.");
        } finally {
            setIsCropperOpen(false);
            setUncroppedImageUrl(null);
        }
    }, [completedCrop, originalMimeType]);

    const handleCropCancel = useCallback(() => {
        setIsCropperOpen(false);
        setUncroppedImageUrl(null);
    }, []);

    const handleSolve = useCallback(async () => {
        if (!imageBase64) return;

        setIsLoading(true);
        setError(null);
        setSolution(null);
        setIsCopied(false);

        try {
            const result = await solveLimitFromImage(imageBase64.base64, imageBase64.mimeType);
            setSolution(result);

            const extractSnippet = (solutionText: string): string => {
                const lines = solutionText.split('\n');
                const snippetLine = lines.find(line => line.includes('$') && line.length < 100) || lines[0] || "Problem";
                return snippetLine.replace(/[\*\`\_#]/g, '').trim();
            };

            const newEntry: HistoryEntry = {
                id: Date.now(),
                imageData: imageBase64,
                problemSnippet: extractSnippet(result),
                fullSolution: result,
            };
            setHistory(prevHistory => [newEntry, ...prevHistory].slice(0, 20)); // Keep max 20 entries

        } catch (err) {
            setError('មានបញ្ហាក្នុងការដោះស្រាយលំហាត់។ សូមព្យាយាមម្តងទៀត។');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [imageBase64]);
    
    const handleCopyToClipboard = useCallback(() => {
        if (!solutionRef.current) return;

        const contentToCopy = solutionRef.current.querySelector('.markdown-content');
        if (!contentToCopy) return;

        const htmlContent = contentToCopy.innerHTML;
        const textContent = (contentToCopy as HTMLElement).innerText;

        navigator.clipboard.write([
            new ClipboardItem({
                'text/html': new Blob([htmlContent], { type: 'text/html' }),
                'text/plain': new Blob([textContent], { type: 'text/plain' })
            })
        ]).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2500);
        }).catch(err => {
            console.error("Failed to copy rich text, falling back to plain text:", err);
            navigator.clipboard.writeText(textContent).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2500);
            }).catch(err2 => {
                 console.error("Failed to copy plain text:", err2);
                 alert("Could not copy text to clipboard.");
            });
        });
    }, []);

    const handleSelectHistoryItem = useCallback((item: HistoryEntry) => {
      setImageBase64(item.imageData);
      setImageUrl(`data:${item.imageData.mimeType};base64,${item.imageData.base64}`);
      setSolution(item.fullSolution);
      setError(null);
      setIsCopied(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleClearHistory = useCallback(() => setHistory([]), []);
    const handleDeleteHistoryEntry = useCallback((id: number) => {
        setHistory(prev => prev.filter(entry => entry.id !== id));
    }, []);


    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8 transition-colors duration-300">
            <div className="w-full max-w-4xl mx-auto relative">
                <div className="absolute top-0 right-0 pt-4 pr-4 sm:pt-2 sm:pr-2">
                    <ThemeToggle theme={theme} onToggle={toggleTheme} />
                </div>
                
                <header className="text-center mb-8 pt-12 sm:pt-6">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white">
                        កម្មវិធីដោះស្រាយ<span className="text-blue-600 dark:text-blue-400">លីមីត</span>គណិតវិទ្យា
                    </h1>
                    <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-500 dark:text-gray-400">
                        បង្ហោះរូបភាពលំហាត់លីមីតរបស់អ្នក ហើយទទួលយកដំណោះស្រាយមួយជំហានម្តងៗពី AI។
                    </p>
                </header>

                <main className="bg-white/70 backdrop-blur-xl border border-gray-200 dark:bg-gray-800/70 dark:border-gray-700 rounded-2xl shadow-lg p-6 sm:p-10">
                    <ImageUploader 
                        onImageChange={handleImageChange}
                        onSolve={handleSolve}
                        imageUrl={imageUrl}
                        isLoading={isLoading}
                        hasImage={!!imageBase64}
                    />
                </main>
                
                <section>
                  <SolutionDisplay
                      ref={solutionRef}
                      solution={solution}
                      isLoading={isLoading}
                      error={error}
                      onCopy={handleCopyToClipboard}
                      isCopied={isCopied}
                  />
                </section>
                
                <HistorySection
                  history={history}
                  onSelect={handleSelectHistoryItem}
                  onClear={handleClearHistory}
                  onDelete={handleDeleteHistoryEntry}
                />
                
                <ImageCropModal 
                    isOpen={isCropperOpen}
                    onClose={handleCropCancel}
                    onConfirm={handleCropConfirm}
                    imageSrc={uncroppedImageUrl}
                    crop={crop}
                    setCrop={setCrop}
                    setCompletedCrop={setCompletedCrop}
                    imageRef={cropImageRef}
                />

                <footer className="text-center mt-12 text-gray-500 dark:text-gray-400 text-sm space-y-1">
                    <p>&copy; {new Date().getFullYear()} - បង្កើតឡើងសម្រាប់ជាជំនួយក្នុងការសិក្សា</p>
                    <p>
                        <a href="https://about-me-kappa-five.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                            ទំនាក់ទំនងអ្នកបង្កើត
                        </a>
                    </p>
                </footer>
            </div>
        </div>
    );
}