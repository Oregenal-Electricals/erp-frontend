'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
function authHeaders(json) { const h = { Authorization: `Bearer ${getToken()}` }; if (json) h['Content-Type'] = 'application/json'; return h; }

function FulfillmentBody() {
  const searchParams = useSearchParams();
  const planId = searchParams.get('planId');

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [reservations, setReservations] = useState({});
  const [reserveQty, setReserveQty] = useState({});
  const [busy, setBusy] = useState('');

  const [pickList, setPickList] = useState(null);
  const [pickQty, setPickQty] = useState({});
  const [batchOptions, setBatchOptions] = useState({});
  const [selectedBatch, setSelectedBatch] = useState({});

  const [verification, setVerification] = useState(null);
  const [verifyQty, setVerifyQty] = useState({});

  const [packing, setPacking] = useState(null);
  const [packQty, setPackQty] = useState({});
  const [activePackageId, setActivePackageId] = useState('');
  const [docReadiness, setDocReadiness] = useState(null);
  const [transport, setTransport] = useState(null);
  const [transportForm, setTransportForm] = useState({ transportType: 'TRANSPORTER_VEHICLE', transporterName: '', vehicleNumber: '', vehicleType: '', driverName: '', driverPhone: '' });
  const [readyForLoading, setReadyForLoading] = useState(null);
  const [dispatchLoading, setDispatchLoading] = useState(null);
  const [actualVehicleNumber, setActualVehicleNumber] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [gateOut, setGateOut] = useState(null);

  const fetchPlan = useCallback(async () => {
    if (!planId || !getToken()) { setLoading(false); return; }
    setLoading(true);
    const res = await fetch(`${API}/dispatch-plans/${planId}`, { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      setPlan(data);
      const resByItem = {};
      for (const item of data.items || []) {
        const r = await fetch(`${API}/dispatch-reservations/by-plan-item/${item.id}`, { headers: authHeaders() });
        if (r.ok) resByItem[item.id] = await r.json();
      }
      setReservations(resByItem);
    } else {
      setError('Could not load Dispatch Plan');
    }
    setLoading(false);
  }, [planId]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  async function handleReserve(item) {
    const qty = Number(reserveQty[item.id]);
    if (!qty || qty <= 0) return;
    setBusy(item.id); setError('');
    const res = await fetch(`${API}/dispatch-reservations`, {
      method: 'POST', headers: authHeaders(true),
      body: JSON.stringify({ dispatchPlanItemId: item.id, requestedQty: qty }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Reservation failed'); setBusy(''); return; }
    await fetchPlan();
    setReserveQty(q => ({ ...q, [item.id]: '' }));
    setBusy('');
  }

  async function handleReleaseReservation(reservationNumber, qty) {
    setBusy(reservationNumber); setError('');
    const res = await fetch(`${API}/dispatch-reservations/${reservationNumber}/release`, {
      method: 'POST', headers: authHeaders(true),
      body: JSON.stringify({ releaseQty: qty }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Release failed'); setBusy(''); return; }
    await fetchPlan();
    setBusy('');
  }

  const allReservations = Object.values(reservations).flat();

  async function handleCreatePickList() {
    setBusy('pick-list'); setError('');
    const res = await fetch(`${API}/pick-lists`, {
      method: 'POST', headers: authHeaders(true),
      body: JSON.stringify({ dispatchPlanId: planId }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Could not create Pick List'); setBusy(''); return; }
    setPickList(data);
    setBusy('');
  }

  async function loadBatchSuggestions(reservationId) {
    const res = await fetch(`${API}/pick-lists/suggest-batches/${reservationId}`, { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      setBatchOptions(b => ({ ...b, [reservationId]: data }));
    }
  }

  async function handlePick(reservation) {
    const qty = Number(pickQty[reservation.id]);
    if (!qty || qty <= 0) return;
    setBusy(reservation.id); setError('');
    const body = { dispatchReservationId: reservation.id, pickQty: qty };
    const batchId = selectedBatch[reservation.id];
    if (batchId) body.batchId = batchId;
    const res = await fetch(`${API}/pick-lists/${pickList.id}/pick`, {
      method: 'POST', headers: authHeaders(true), body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Pick failed'); setBusy(''); return; }
    const plRes = await fetch(`${API}/pick-lists/${pickList.id}`, { headers: authHeaders() });
    if (plRes.ok) setPickList(await plRes.json());
    setPickQty(q => ({ ...q, [reservation.id]: '' }));
    setBusy('');
  }

  async function handleCreateVerification() {
    setBusy('verification'); setError('');
    const res = await fetch(`${API}/dispatch-verifications`, {
      method: 'POST', headers: authHeaders(true),
      body: JSON.stringify({ pickListId: pickList.id }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Could not create Verification'); setBusy(''); return; }
    setVerification(data);
    setBusy('');
  }

  async function handleVerify(pickItem) {
    const qty = Number(verifyQty[pickItem.id]);
    if (!qty || qty <= 0) return;
    setBusy(pickItem.id); setError('');
    const res = await fetch(`${API}/dispatch-verifications/${verification.id}/verify`, {
      method: 'POST', headers: authHeaders(true),
      body: JSON.stringify({ pickListItemId: pickItem.id, verifiedQty: qty }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Verification failed'); setBusy(''); return; }
    const vRes = await fetch(`${API}/dispatch-verifications/${verification.id}`, { headers: authHeaders() });
    if (vRes.ok) setVerification(await vRes.json());
    setVerifyQty(q => ({ ...q, [pickItem.id]: '' }));
    setBusy('');
  }

  async function handleCreatePacking() {
    setBusy('packing'); setError('');
    const res = await fetch(`${API}/dispatch-packing`, {
      method: 'POST', headers: authHeaders(true),
      body: JSON.stringify({ verificationId: verification.id }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Could not create Packing'); setBusy(''); return; }
    setPacking(data);
    setBusy('');
  }

  async function handleAddPackage() {
    setBusy('add-package'); setError('');
    const res = await fetch(`${API}/dispatch-packing/${packing.id}/packages`, {
      method: 'POST', headers: authHeaders(true),
      body: JSON.stringify({ packageType: 'CARTON' }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Could not create package'); setBusy(''); return; }
    const pkRes = await fetch(`${API}/dispatch-packing/${packing.id}`, { headers: authHeaders() });
    if (pkRes.ok) setPacking(await pkRes.json());
    setActivePackageId(data.id);
    setBusy('');
  }

  async function handlePack(verificationItem) {
    const key = `${verificationItem.id}_${activePackageId}`;
    const qty = Number(packQty[key]);
    if (!qty || qty <= 0 || !activePackageId) return;
    setBusy(key); setError('');
    const res = await fetch(`${API}/dispatch-packing/packages/${activePackageId}/items`, {
      method: 'POST', headers: authHeaders(true),
      body: JSON.stringify({ verificationItemId: verificationItem.id, packedQty: qty }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Packing failed'); setBusy(''); return; }
    const pkRes = await fetch(`${API}/dispatch-packing/${packing.id}`, { headers: authHeaders() });
    if (pkRes.ok) setPacking(await pkRes.json());
    setPackQty(q => ({ ...q, [key]: '' }));
    setBusy('');
  }

  async function fetchDocReadiness() {
    const res = await fetch(`${API}/dispatch-plans/${planId}/document-readiness`, { headers: authHeaders() });
    if (res.ok) setDocReadiness(await res.json());
  }

  async function handleCreateTransport() {
    setBusy('transport'); setError('');
    const res = await fetch(`${API}/dispatch-transport`, {
      method: 'POST', headers: authHeaders(true),
      body: JSON.stringify({ dispatchPlanId: planId, ...transportForm }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Could not create Transport Assignment'); setBusy(''); return; }
    setTransport(data);
    setBusy('');
  }

  async function handleAssignPackageToVehicle(packageId) {
    setBusy(`assign-${packageId}`); setError('');
    const res = await fetch(`${API}/dispatch-transport/${transport.id}/packages`, {
      method: 'POST', headers: authHeaders(true), body: JSON.stringify({ packageId }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Package assignment failed'); setBusy(''); return; }
    setTransport(data);
    setBusy('');
  }

  async function handleConfirmTransport() {
    setBusy('confirm-transport'); setError('');
    const res = await fetch(`${API}/dispatch-transport/${transport.id}/confirm`, { method: 'POST', headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Confirmation failed'); setBusy(''); return; }
    setTransport(data);
    setBusy('');
  }

  async function handleCheckReadyForLoading() {
    setBusy('check-ready'); setError('');
    const res = await fetch(`${API}/dispatch-transport/${transport.id}/ready-for-loading`, { headers: authHeaders() });
    const data = await res.json();
    setReadyForLoading(data);
    setBusy('');
  }

  async function handleStartLoading() {
    setBusy('start-loading'); setError('');
    const res = await fetch(`${API}/dispatch-loading`, {
      method: 'POST', headers: authHeaders(true),
      body: JSON.stringify({ transportAssignmentId: transport.id, actualVehicleNumber: actualVehicleNumber || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Could not start loading'); setBusy(''); return; }
    setDispatchLoading(data);
    setBusy('');
  }

  async function handleLoadPackage(packageId) {
    setBusy(`load-${packageId}`); setError('');
    const res = await fetch(`${API}/dispatch-loading/${dispatchLoading.id}/packages`, {
      method: 'POST', headers: authHeaders(true),
      body: JSON.stringify({ packageId, actualVehicleNumber: actualVehicleNumber || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Package load failed'); setBusy(''); return; }
    setDispatchLoading(l => ({ ...l, items: [...(l.items || []), data] }));
    setBusy('');
  }

  async function handleCompleteLoading() {
    setBusy('complete-loading'); setError('');
    const res = await fetch(`${API}/dispatch-loading/${dispatchLoading.id}/complete`, { method: 'POST', headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Could not complete loading'); setBusy(''); return; }
    setDispatchLoading(data);
    setBusy('');
  }

  async function handleCreateConfirmation() {
    setBusy('create-confirmation'); setError('');
    const res = await fetch(`${API}/dispatch-confirmation`, {
      method: 'POST', headers: authHeaders(true), body: JSON.stringify({ loadingId: dispatchLoading.id }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Could not create Confirmation'); setBusy(''); return; }
    setConfirmation(data);
    setBusy('');
  }

  async function handleConfirmPackage(packageId) {
    setBusy(`confirm-${packageId}`); setError('');
    const res = await fetch(`${API}/dispatch-confirmation/${confirmation.id}/packages`, {
      method: 'POST', headers: authHeaders(true), body: JSON.stringify({ packageId }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Package confirmation failed'); setBusy(''); return; }
    const cRes = await fetch(`${API}/dispatch-confirmation/${confirmation.id}`, { headers: authHeaders() });
    if (cRes.ok) setConfirmation(await cRes.json());
    setBusy('');
  }

  async function handleConfirmGateOut() {
    setBusy('gate-out'); setError('');
    const res = await fetch(`${API}/dispatch-gate-out`, {
      method: 'POST', headers: authHeaders(true),
      body: JSON.stringify({ dispatchConfirmationId: confirmation.id, actualVehicleNumber: actualVehicleNumber || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Gate-Out failed'); setBusy(''); return; }
    setGateOut(data);
    setBusy('');
  }

  if (!planId) {
    return <div className="p-6">Missing plan. Open a Dispatch Plan and click &quot;Fulfill&quot;.</div>;
  }
  if (loading) return <div className="p-6">Loading...</div>;
  if (!plan) return <div className="p-6 text-red-600">{error || 'Dispatch Plan not found'}</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dispatch Fulfillment — {plan.planNumber}</h1>
        <p className="text-sm text-gray-500">{plan.salesOrder?.soNumber || plan.soId} · {plan.customerName}</p>
      </div>
      {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>}

      <section className="border rounded-lg p-4">
        <h2 className="font-medium mb-3">1. Stock Reservation</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 border-b">
            <tr><th className="py-1">Item</th><th>Planned</th><th>Reserved (net)</th><th>Reserve More</th></tr>
          </thead>
          <tbody>
            {(plan.items || []).map(item => {
              const resList = reservations[item.id] || [];
              const netReserved = resList.reduce((s, r) => s + (r.reservedQty - r.releasedQty), 0);
              return (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2">{item.itemName || item.itemCode}</td>
                  <td>{item.plannedQty}</td>
                  <td>{netReserved}</td>
                  <td>
                    <div className="flex gap-2 items-center">
                      <input type="number" className="border rounded px-2 py-1 w-24" placeholder="Qty"
                        value={reserveQty[item.id] || ''} onChange={e => setReserveQty(q => ({ ...q, [item.id]: e.target.value }))} />
                      <button disabled={busy === item.id} onClick={() => handleReserve(item)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50">Reserve</button>
                    </div>
                    {resList.map(r => (
                      <div key={r.id} className="text-xs text-gray-500 mt-1 flex gap-2 items-center">
                        {r.reservationNumber}: {r.reservedQty - r.releasedQty} active
                        <button disabled={busy === r.reservationNumber} onClick={() => handleReleaseReservation(r.reservationNumber, r.reservedQty - r.releasedQty)}
                          className="underline text-red-500">release</button>
                      </div>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {allReservations.length > 0 && (
        <section className="border rounded-lg p-4">
          <h2 className="font-medium mb-3">2. Pick List</h2>
          {!pickList ? (
            <button disabled={busy === 'pick-list'} onClick={handleCreatePickList}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm disabled:opacity-50">Create Pick List</button>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-2">{pickList.pickListNumber} · {pickList.status}</p>
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b">
                  <tr><th className="py-1">Reservation</th><th>Type</th><th>Batch</th><th>Pick Qty</th></tr>
                </thead>
                <tbody>
                  {allReservations.map(r => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2">{r.reservationNumber} ({r.itemCode})</td>
                      <td>{r.reservationType}</td>
                      <td>
                        {r.reservationType !== 'SFG_DISPATCH' && (
                          <select className="border rounded px-1 py-1 text-xs" value={selectedBatch[r.id] || ''}
                            onFocus={() => loadBatchSuggestions(r.id)}
                            onChange={e => setSelectedBatch(s => ({ ...s, [r.id]: e.target.value }))}>
                            <option value="">No batch</option>
                            {(batchOptions[r.id] || []).map(b => (
                              <option key={b.batchId} value={b.batchId}>{b.batchNumber} ({b.freeQty} free)</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2 items-center">
                          <input type="number" className="border rounded px-2 py-1 w-20" placeholder="Qty"
                            value={pickQty[r.id] || ''} onChange={e => setPickQty(q => ({ ...q, [r.id]: e.target.value }))} />
                          <button disabled={busy === r.id} onClick={() => handlePick(r)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50">Pick</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {pickList && pickList.status !== 'CREATED' && (
        <section className="border rounded-lg p-4">
          <h2 className="font-medium mb-3">3. Verification</h2>
          {!verification ? (
            <button disabled={busy === 'verification'} onClick={handleCreateVerification}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm disabled:opacity-50">Create Verification</button>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-2">{verification.verificationNumber} · {verification.status}</p>
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b">
                  <tr><th className="py-1">Pick Item</th><th>Picked</th><th>Verify Qty</th></tr>
                </thead>
                <tbody>
                  {(pickList.items || []).map(pi => (
                    <tr key={pi.id} className="border-b last:border-0">
                      <td className="py-2">{pi.itemCode} ({pi.saleType})</td>
                      <td>{pi.pickedQty - pi.reversedQty}</td>
                      <td>
                        <div className="flex gap-2 items-center">
                          <input type="number" className="border rounded px-2 py-1 w-20" placeholder="Qty"
                            value={verifyQty[pi.id] || ''} onChange={e => setVerifyQty(q => ({ ...q, [pi.id]: e.target.value }))} />
                          <button disabled={busy === pi.id} onClick={() => handleVerify(pi)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50">Verify</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {verification && verification.status !== 'PENDING' && verification.status !== 'EXCEPTION' && (
        <section className="border rounded-lg p-4">
          <h2 className="font-medium mb-3">4. Packing</h2>
          {!packing ? (
            <button disabled={busy === 'packing'} onClick={handleCreatePacking}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm disabled:opacity-50">Create Packing</button>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-2">{packing.packingNumber} · {packing.status}</p>
              <div className="flex gap-2 items-center mb-3">
                <button disabled={busy === 'add-package'} onClick={handleAddPackage}
                  className="px-3 py-1.5 bg-gray-700 text-white rounded text-sm disabled:opacity-50">+ New Package</button>
                {(packing.packages || []).length > 0 && (
                  <select className="border rounded px-2 py-1 text-sm" value={activePackageId} onChange={e => setActivePackageId(e.target.value)}>
                    <option value="">Select package to fill</option>
                    {packing.packages.map(p => <option key={p.id} value={p.id}>{p.packageNumber}</option>)}
                  </select>
                )}
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b">
                  <tr><th className="py-1">Verified Item</th><th>Verified</th><th>Pack Qty</th></tr>
                </thead>
                <tbody>
                  {(verification.items || []).filter(vi => vi.status === 'VERIFIED').map(vi => {
                    const key = `${vi.id}_${activePackageId}`;
                    return (
                      <tr key={vi.id} className="border-b last:border-0">
                        <td className="py-2">{vi.itemCode} ({vi.saleType})</td>
                        <td>{vi.verifiedQty - vi.reversedQty}</td>
                        <td>
                          <div className="flex gap-2 items-center">
                            <input type="number" className="border rounded px-2 py-1 w-20" placeholder="Qty" disabled={!activePackageId}
                              value={packQty[key] || ''} onChange={e => setPackQty(q => ({ ...q, [key]: e.target.value }))} />
                            <button disabled={busy === key || !activePackageId} onClick={() => handlePack(vi)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50">Pack</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-3 text-sm">
                {(packing.packages || []).map(p => (
                  <div key={p.id} className="text-gray-600">{p.packageNumber} ({p.packageType}): {(p.items||[]).reduce((s,i)=>s+(i.packedQty-i.reversedQty),0)} packed</div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {packing && packing.status !== 'DRAFT' && (
        <section className="border rounded-lg p-4">
          <h2 className="font-medium mb-3">5. Document Readiness</h2>
          <button onClick={fetchDocReadiness} className="px-3 py-1.5 bg-gray-700 text-white rounded text-sm mb-3">Check Document Readiness</button>
          {docReadiness && (
            <div className="text-sm space-y-1">
              <div>Invoice: <span className="font-medium">{docReadiness.invoice.status}</span> {docReadiness.invoice.invoiceNumber && `(${docReadiness.invoice.invoiceNumber})`} {docReadiness.invoice.reason && <span className="text-gray-500">- {docReadiness.invoice.reason}</span>}</div>
              <div>Challan: <span className="font-medium">{docReadiness.challan.status}</span></div>
              <div>E-Way Bill: <span className="font-medium">{docReadiness.ewayBill.status}</span> {docReadiness.ewayBill.ewayBillNumber && `(${docReadiness.ewayBill.ewayBillNumber})`} {docReadiness.ewayBill.reason && <span className="text-gray-500">- {docReadiness.ewayBill.reason}</span>}</div>
              <div>E-Invoice/IRN: <span className="font-medium">{docReadiness.eInvoiceIrn.status}</span></div>
              <div className="pt-2 font-semibold">Overall: {docReadiness.overall}</div>
            </div>
          )}
        </section>
      )}

      {packing && packing.status !== 'DRAFT' && (
        <section className="border rounded-lg p-4">
          <h2 className="font-medium mb-3">6. Transport Assignment</h2>
          {!transport ? (
            <div className="space-y-2 max-w-md">
              <select className="border rounded px-2 py-1 text-sm w-full" value={transportForm.transportType} onChange={e => setTransportForm(f => ({ ...f, transportType: e.target.value }))}>
                <option value="TRANSPORTER_VEHICLE">Transporter Vehicle</option>
                <option value="OWN_VEHICLE">Own Vehicle</option>
                <option value="CUSTOMER_PICKUP">Customer Pickup</option>
              </select>
              <input className="border rounded px-2 py-1 text-sm w-full" placeholder="Transporter Name" value={transportForm.transporterName} onChange={e => setTransportForm(f => ({ ...f, transporterName: e.target.value }))} />
              <input className="border rounded px-2 py-1 text-sm w-full" placeholder="Vehicle Number" value={transportForm.vehicleNumber} onChange={e => setTransportForm(f => ({ ...f, vehicleNumber: e.target.value }))} />
              <input className="border rounded px-2 py-1 text-sm w-full" placeholder="Driver Name" value={transportForm.driverName} onChange={e => setTransportForm(f => ({ ...f, driverName: e.target.value }))} />
              <input className="border rounded px-2 py-1 text-sm w-full" placeholder="Driver Phone" value={transportForm.driverPhone} onChange={e => setTransportForm(f => ({ ...f, driverPhone: e.target.value }))} />
              <button disabled={busy === 'transport'} onClick={handleCreateTransport} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm disabled:opacity-50">Create Transport Assignment</button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-2">{transport.assignmentNumber} · {transport.status} · {transport.vehicleNumber}</p>
              <table className="w-full text-sm mb-3">
                <thead className="text-left text-gray-500 border-b">
                  <tr><th className="py-1">Package</th><th>Type</th><th>Assigned</th><th></th></tr>
                </thead>
                <tbody>
                  {(packing.packages || []).map(p => {
                    const isAssigned = (transport.packages || []).some(tp => tp.id === p.id);
                    return (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2">{p.packageNumber}</td>
                        <td>{p.packageType}</td>
                        <td>{isAssigned ? 'Yes' : 'No'}</td>
                        <td>
                          {!isAssigned && (
                            <button disabled={busy === `assign-${p.id}`} onClick={() => handleAssignPackageToVehicle(p.id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50">Assign to Vehicle</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {transport.status === 'DRAFT' && (
                <button disabled={busy === 'confirm-transport'} onClick={handleConfirmTransport} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm disabled:opacity-50 mr-2">Confirm Assignment</button>
              )}
              <button disabled={busy === 'check-ready'} onClick={handleCheckReadyForLoading} className="px-3 py-1.5 bg-gray-700 text-white rounded text-sm disabled:opacity-50">Check Ready For Loading</button>
              {readyForLoading && (
                <div className="mt-3 text-sm">
                  <div className="font-semibold">{readyForLoading.readyForLoading ? 'READY FOR LOADING' : 'NOT READY FOR LOADING'}</div>
                  {readyForLoading.reasons.length > 0 && (
                    <ul className="list-disc pl-5 text-gray-600">
                      {readyForLoading.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {transport && transport.status === 'ASSIGNED' && (
        <section className="border rounded-lg p-4">
          <h2 className="font-medium mb-3">7. Loading</h2>
          <input className="border rounded px-2 py-1 text-sm w-full max-w-xs mb-2" placeholder="Actual Vehicle Number (optional check)" value={actualVehicleNumber} onChange={e => setActualVehicleNumber(e.target.value)} />
          {!dispatchLoading ? (
            <div>
              <button disabled={busy === 'start-loading'} onClick={handleStartLoading} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm disabled:opacity-50">Start Loading</button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-2">{dispatchLoading.loadingNumber} · {dispatchLoading.status}</p>
              <table className="w-full text-sm mb-3">
                <thead className="text-left text-gray-500 border-b"><tr><th className="py-1">Package</th><th>Loaded</th><th></th></tr></thead>
                <tbody>
                  {(transport.packages || []).map(p => {
                    const isLoaded = (dispatchLoading.items || []).some(i => i.packageId === p.id && i.status === 'LOADED');
                    return (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2">{p.packageNumber}</td>
                        <td>{isLoaded ? 'Yes' : 'No'}</td>
                        <td>
                          {!isLoaded && (
                            <button disabled={busy === `load-${p.id}`} onClick={() => handleLoadPackage(p.id)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50">Scan / Load</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {dispatchLoading.status !== 'COMPLETE' && (
                <button disabled={busy === 'complete-loading'} onClick={handleCompleteLoading} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm disabled:opacity-50">Complete Loading</button>
              )}
            </div>
          )}
        </section>
      )}

      {dispatchLoading && (dispatchLoading.status === 'PARTIALLY_LOADED' || dispatchLoading.status === 'COMPLETE') && (
        <section className="border rounded-lg p-4">
          <h2 className="font-medium mb-3">8. Dispatch Confirmation</h2>
          {!confirmation ? (
            <button disabled={busy === 'create-confirmation'} onClick={handleCreateConfirmation} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm disabled:opacity-50">Start Confirmation</button>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-2">{confirmation.confirmationNumber} · {confirmation.status} {confirmation.confirmationType && `· ${confirmation.confirmationType}`}</p>
              <table className="w-full text-sm mb-3">
                <thead className="text-left text-gray-500 border-b"><tr><th className="py-1">Package</th><th>Confirmed</th><th></th></tr></thead>
                <tbody>
                  {(transport.packages || []).map(p => {
                    const isConfirmed = (confirmation.items || []).some(i => i.packageId === p.id && i.status === 'CONFIRMED');
                    return (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2">{p.packageNumber}</td>
                        <td>{isConfirmed ? 'Yes' : 'No'}</td>
                        <td>
                          {!isConfirmed && (
                            <button disabled={busy === `confirm-${p.id}`} onClick={() => handleConfirmPackage(p.id)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50">Confirm</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {confirmation && confirmation.status === 'READY_FOR_GATE_OUT' && (
        <section className="border rounded-lg p-4">
          <h2 className="font-medium mb-3">9. Gate-Out</h2>
          {!gateOut ? (
            <button disabled={busy === 'gate-out'} onClick={handleConfirmGateOut} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm disabled:opacity-50">Confirm Vehicle Exit (Gate-Out)</button>
          ) : (
            <div className="text-sm">
              <p className="font-semibold text-green-700">DISPATCHED</p>
              <p className="text-gray-500">{gateOut.gateOutNumber} · Vehicle {gateOut.vehicleNumber} · {new Date(gateOut.gateOutAt).toLocaleString()}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default function DispatchFulfillmentPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <FulfillmentBody />
      </Suspense>
    </AppLayout>
  );
}
