'use client';
import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtSize = b => b < 1024 ? b+' B' : b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB';
const FILE_ICONS = { PDF:'📄', IMAGE:'🖼️', EXCEL:'📊', WORD:'📝', OTHER:'📎' };

function detectFileType(mimeType) {
  if (mimeType?.includes('pdf')) return 'PDF';
  if (mimeType?.includes('image')) return 'IMAGE';
  if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'EXCEL';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return 'WORD';
  return 'OTHER';
}

export default function DocumentAttachments({ referenceType, referenceId, referenceNumber, title = 'Attachments' }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef();

  async function fetchDocs() {
    if (!getToken() || !referenceId) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ referenceType, referenceId, limit: 50 });
    const res = await fetch(`${API}/documents?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setDocs(d.data || []); }
    setLoading(false);
  }

  useEffect(() => { fetchDocs(); }, [referenceId]);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('File too large. Max 10MB.'); return; }
    setSelectedFile(file);
    if (!docTitle) setDocTitle(file.name.replace(/\.[^.]+$/, ''));
    setError('');
  }

  async function handleUpload() {
    if (!selectedFile) { setError('Select a file'); return; }
    if (!docTitle.trim()) { setError('Enter document title'); return; }
    setUploading(true); setError('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      const body = {
        title: docTitle.trim(),
        category: 'GENERAL',
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileData: base64,
        mimeType: selectedFile.type || 'application/octet-stream',
        referenceType, referenceId, referenceNumber,
      };
      const res = await fetch(`${API}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) { setShowUpload(false); setSelectedFile(null); setDocTitle(''); fetchDocs(); }
      else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Upload failed');
      setUploading(false);
    };
    reader.readAsDataURL(selectedFile);
  }

  async function handleDownload(id, fileName) {
    const res = await fetch(`${API}/documents/${id}/download`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this attachment?')) return;
    const res = await fetch(`${API}/documents/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) fetchDocs();
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">📎 {title}</span>
          {docs.length > 0 && <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{docs.length}</span>}
        </div>
        <button
          onClick={() => { setShowUpload(!showUpload); setSelectedFile(null); setDocTitle(''); setError(''); }}
          className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-2 py-1 rounded hover:bg-blue-50"
        >
          {showUpload ? 'Cancel' : '+ Attach'}
        </button>
      </div>

      {showUpload && (
        <div className="border rounded-xl p-4 mb-3 bg-blue-50 space-y-3">
          {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-xs">{error}</div>}
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-white ${selectedFile ? 'border-blue-400 bg-white' : 'border-blue-200'}`}
          >
            {selectedFile ? (
              <div>
                <div className="text-xl mb-0.5">{FILE_ICONS[detectFileType(selectedFile.type)]}</div>
                <div className="text-sm font-medium text-gray-700">{selectedFile.name}</div>
                <div className="text-xs text-gray-400">{fmtSize(selectedFile.size)}</div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">📤 Click to select file (max 10MB)</div>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            placeholder="Document title *"
            value={docTitle}
            onChange={e => setDocTitle(e.target.value)}
          />
          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload Attachment'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-xs text-gray-400 py-2">Loading attachments...</div>
      ) : docs.length === 0 ? (
        <div className="text-xs text-gray-400 py-2 text-center border border-dashed rounded-lg">No attachments yet</div>
      ) : (
        <div className="space-y-1">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-base">{FILE_ICONS[doc.fileType] || '📎'}</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{doc.title}</div>
                  <div className="text-xs text-gray-400">{doc.fileName} · {fmtSize(doc.fileSize)} · {fmtDate(doc.createdAt)}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button onClick={() => handleDownload(doc.id, doc.fileName)} className="text-xs text-teal-600 hover:text-teal-800 px-2 py-1 rounded hover:bg-teal-50">⬇</button>
                <button onClick={() => handleDelete(doc.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
