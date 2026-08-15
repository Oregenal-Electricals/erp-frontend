'use client';
import { useEffect, useState } from 'react';
import { isInPreview, getPreviewRoleName, exitPreview } from '@/lib/previewSession';

export default function PreviewBanner() {
  const [inPreview, setInPreview] = useState(false);
  const [roleName, setRoleName] = useState('');

  useEffect(() => {
    setInPreview(isInPreview());
    setRoleName(getPreviewRoleName());
  }, []);

  if (!inPreview) return null;

  return (
    <div className="sticky top-0 z-[100] bg-purple-700 text-white px-4 py-2 flex items-center justify-between text-sm shadow-md">
      <div>
        <span className="font-semibold">PREVIEW MODE</span> — Viewing and acting as <span className="font-semibold">{roleName}</span>. Everything you do is tagged as test data.
      </div>
      <button
        onClick={exitPreview}
        className="bg-white text-purple-700 px-3 py-1 rounded text-xs font-medium hover:bg-purple-50"
      >
        Exit Preview
      </button>
    </div>
  );
}
