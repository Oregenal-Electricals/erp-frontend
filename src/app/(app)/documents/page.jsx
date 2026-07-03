'use client';
import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtSize = b => b < 1024 ? b+' B' : b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB';

const CATEGORIES = ['PURCHASE','QUALITY','SALES','FINANCE','HR','PRODUCTION','GENERAL'];
const CAT_COLORS = { PURCHASE:'bg-blue-100 text-blue-700', QUALITY:'bg-yellow-100 text-yellow-700', SALES:'bg-green-100 text-green-700', FINANCE:'bg-purple-100 text-purple-700', HR:'bg-pink-100 text-pink-700', PRODUCTION:'bg-orange-100 text-orange-700', GENERAL:'bg-gray-100 text-gray-600' };
const FILE_ICONS = { PDF:'📄', IMAGE:'🖼️', EXCEL:'📊', WORD:'📝', OTHER:'📎' };

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [viewDetail, setViewDetail] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title:'', category:'GENERAL', description:'', referenceType:'', referenceNumber:'', tags:'' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit:20 });
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    const [dRes, sRes] = await Promise.all([
      fetch(`${API}/documents?${params}`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/documents/stats`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (dRes.ok) { const d=await dRes.json(); setDocs(d.data||[]); setTotal(d.total); setTotalPages(d.totalPages||1); }
    if (sRes.ok) setStats(await sRes.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchAll(); },[page, search, category]);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10*1024*1024) { setError('File too large. Max 10MB.'); return; }
    setSelectedFile(file);
    if (!uploadForm.title) setUploadForm(f=>({...f, title:file.name.replace(/\.[^.]+$/,'')}));
    setError('');
  }

  async function handleUpload() {
    if (!selectedFile) { setError('Select a file'); return; }
    if (!uploadForm.title) { setError('Enter document title'); return; }
    setUploading(true); setError('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      const body = {
        title: uploadForm.title, category: uploadForm.category,
        fileName: selectedFile.name, fileSize: selectedFile.size,
        fileData: base64, mimeType: selectedFile.type || 'application/octet-stream',
        description: uploadForm.description || undefined,
        referenceType: uploadForm.referenceType || undefined,
        referenceNumber: uploadForm.referenceNumber || undefined,
        tags: uploadForm.tags || undefined,
      };
      const res = await fetch(`${API}/documents`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
      const data = await res.json();
      if (res.ok) { setShowUpload(false); setSelectedFile(null); setUploadForm({title:'',category:'GENERAL',description:'',referenceType:'',referenceNumber:'',tags:''}); fetchAll(); }
      else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Upload failed');
      setUploading(false);
    };
    reader.readAsDataURL(selectedFile);
  }

  async function handleDownload(id, fileName) {
    const res = await fetch(`${API}/documents/${id}/download`,{headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=fileName; a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this document?')) return;
    const res = await fetch(`${API}/documents/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) fetchAll();
  }

  async function openDetail(id) {
    const res = await fetch(`${API}/documents/${id}`,{headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setViewDetail(await res.json());
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Document Center</h1>
            <p className="text-gray-500 text-sm mt-1">Upload, organize and version-control company documents</p>
          </div>
          <button onClick={()=>{setShowUpload(true);setError('');setSelectedFile(null);setUploadForm({title:'',category:'GENERAL',description:'',referenceType:'',referenceNumber:'',tags:''}); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-medium text-sm">+ Upload Document</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-teal-50 rounded-xl p-4 text-center col-span-2 md:col-span-1">
              <div className="text-2xl font-bold text-teal-700">{stats.total}</div>
              <div className="text-xs text-gray-500 mt-1">Total Documents</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-700">{stats.totalSizeMB} MB</div>
              <div className="text-xs text-gray-500 mt-1">Storage Used</div>
            </div>
            {stats.byCategory?.slice(0,2).map(c=>(
              <div key={c.category} className={`rounded-xl p-4 text-center ${CAT_COLORS[c.category]?.split(' ')[0]||'bg-gray-50'}`}>
                <div className="text-2xl font-bold">{c._count.id}</div>
                <div className="text-xs mt-1">{c.category}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search title, tags, reference number..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={category} onChange={e=>{setCategory(e.target.value);setPage(1);}}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} documents</span>
          </div>

          {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
          : docs.length===0 ? <div className="text-center py-16"><div className="text-4xl mb-3">📁</div><div className="text-gray-500">No documents found. Upload your first document.</div></div>
          : (
            <div className="divide-y">
              {docs.map(doc=>(
                <div key={doc.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={()=>openDetail(doc.id)}>
                      <span className="text-2xl">{FILE_ICONS[doc.fileType]||'📎'}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-gray-400">{doc.documentNumber}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${CAT_COLORS[doc.category]}`}>{doc.category}</span>
                          {doc._count?.versions > 0 && <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">{doc._count.versions} version{doc._count.versions>1?'s':''}</span>}
                          {doc.referenceNumber && <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{doc.referenceNumber}</span>}
                        </div>
                        <div className="font-medium text-gray-800 text-sm mt-0.5">{doc.title}</div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                          <span>{doc.fileName}</span>
                          <span>{fmtSize(doc.fileSize)}</span>
                          <span>{fmtDate(doc.createdAt)}</span>
                          {doc.tags && <span className="text-indigo-400">#{doc.tags.split(',').join(' #')}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>handleDownload(doc.id,doc.fileName)} className="px-3 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700">⬇ Download</button>
                      <button onClick={()=>openDetail(doc.id)} className="px-3 py-1 text-xs border rounded hover:bg-gray-50">View</button>
                      <button onClick={()=>handleDelete(doc.id)} className="px-3 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalPages>1&&<div className="p-4 border-t flex justify-center gap-2"><button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button><span className="px-3 py-1 text-sm">{page} of {totalPages}</span><button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button></div>}
        </div>

        {/* DETAIL MODAL */}
        {viewDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{FILE_ICONS[viewDetail.fileType]||'📎'}</span>
                  <div>
                    <div className="font-bold text-gray-800">{viewDetail.title}</div>
                    <div className="font-mono text-xs text-gray-400">{viewDetail.documentNumber} · v{viewDetail.version}</div>
                  </div>
                </div>
                <button onClick={()=>setViewDetail(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-gray-500">Category:</span><span className={`px-2 py-0.5 rounded text-xs ${CAT_COLORS[viewDetail.category]}`}>{viewDetail.category}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">File:</span><span>{viewDetail.fileName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Size:</span><span>{fmtSize(viewDetail.fileSize)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Type:</span><span>{viewDetail.fileType}</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-gray-500">Uploaded:</span><span>{fmtDate(viewDetail.createdAt)}</span></div>
                    {viewDetail.referenceType&&<div className="flex justify-between"><span className="text-gray-500">Ref Type:</span><span>{viewDetail.referenceType}</span></div>}
                    {viewDetail.referenceNumber&&<div className="flex justify-between"><span className="text-gray-500">Ref Number:</span><span className="font-mono text-blue-600">{viewDetail.referenceNumber}</span></div>}
                    {viewDetail.tags&&<div className="flex justify-between"><span className="text-gray-500">Tags:</span><span className="text-indigo-600 text-xs">#{viewDetail.tags.split(',').join(' #')}</span></div>}
                  </div>
                </div>
                {viewDetail.description&&<div className="p-3 bg-gray-50 rounded text-sm">{viewDetail.description}</div>}

                {viewDetail.versions?.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-700 text-sm mb-2">Version History</div>
                    {viewDetail.versions.map(v=>(
                      <div key={v.id} className="flex items-center justify-between py-2 border-b text-sm">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">v{v.version}</span>
                          <div><div className="text-xs font-medium">{v.fileName}</div><div className="text-xs text-gray-400">{fmtDate(v.createdAt)} · {fmtSize(v.fileSize)}</div></div>
                        </div>
                        <button onClick={()=>handleDownload(v.id,v.fileName)} className="px-2 py-1 text-xs bg-teal-600 text-white rounded">⬇</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>handleDownload(viewDetail.id,viewDetail.fileName)} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm">⬇ Download</button>
                <button onClick={()=>setViewDetail(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* UPLOAD MODAL */}
        {showUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold text-teal-700">Upload Document</h2>
                <button onClick={()=>setShowUpload(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">File * (max 10MB)</label>
                  <div onClick={()=>fileRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 ${selectedFile?'border-teal-400 bg-teal-50':'border-gray-300'}`}>
                    {selectedFile ? (
                      <div><div className="text-2xl mb-1">{FILE_ICONS[selectedFile.type?.includes('pdf')?'PDF':selectedFile.type?.includes('image')?'IMAGE':'OTHER']}</div><div className="font-medium text-sm">{selectedFile.name}</div><div className="text-xs text-gray-500">{fmtSize(selectedFile.size)}</div></div>
                    ) : (
                      <div><div className="text-3xl mb-2">📤</div><div className="text-sm text-gray-500">Click to select file</div><div className="text-xs text-gray-400 mt-1">PDF, Image, Excel, Word — max 10MB</div></div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx" onChange={handleFileSelect} />
                </div>
                <div><label className="block text-sm text-gray-600 mb-1">Title *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={uploadForm.title} onChange={e=>setUploadForm(f=>({...f,title:e.target.value}))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm text-gray-600 mb-1">Category</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={uploadForm.category} onChange={e=>setUploadForm(f=>({...f,category:e.target.value}))}>
                      {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm text-gray-600 mb-1">Reference Type</label><input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="PO, SO, NCR..." value={uploadForm.referenceType} onChange={e=>setUploadForm(f=>({...f,referenceType:e.target.value}))} /></div>
                  <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Reference Number</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="PO-2026-0001" value={uploadForm.referenceNumber} onChange={e=>setUploadForm(f=>({...f,referenceNumber:e.target.value}))} /></div>
                </div>
                <div><label className="block text-sm text-gray-600 mb-1">Tags (comma-separated)</label><input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="purchase, vendor, urgent" value={uploadForm.tags} onChange={e=>setUploadForm(f=>({...f,tags:e.target.value}))} /></div>
                <div><label className="block text-sm text-gray-600 mb-1">Description</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={uploadForm.description} onChange={e=>setUploadForm(f=>({...f,description:e.target.value}))} /></div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setShowUpload(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleUpload} disabled={uploading||!selectedFile} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm disabled:opacity-50">{uploading?'Uploading...':'Upload'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
