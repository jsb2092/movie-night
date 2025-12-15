import { createContext, useContext, useCallback, type ReactNode } from 'react';

interface ImageContextValue {
  getImageUrl: (path: string) => string;
}

const ImageContext = createContext<ImageContextValue | null>(null);

interface ImageProviderProps {
  children: ReactNode;
  plexUrl: string | null;
  plexToken: string | null;
}

export function ImageProvider({ children, plexUrl, plexToken }: ImageProviderProps) {
  const getImageUrl = useCallback((path: string): string => {
    if (!path) return '';
    if (!plexUrl || !plexToken) return path;

    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}url=${encodeURIComponent(plexUrl)}&token=${encodeURIComponent(plexToken)}`;
  }, [plexUrl, plexToken]);

  return (
    <ImageContext.Provider value={{ getImageUrl }}>
      {children}
    </ImageContext.Provider>
  );
}

export function useImageUrl() {
  const context = useContext(ImageContext);
  if (!context) {
    throw new Error('useImageUrl must be used within an ImageProvider');
  }
  return context.getImageUrl;
}
