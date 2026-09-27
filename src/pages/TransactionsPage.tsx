import { Html5QrcodeScanner } from 'html5-qrcode'
import { CheckCircle2, ClipboardCheck, QrCode, RefreshCw, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

import { Button } from '../components/ui/button'
import { useAuth } from '../features/auth/AuthContext'
import { completeTransaction, issueTransactionQr, listTransactions, verifyTransactionQr, type Transaction } from '../services/transactionService'

function TransactionStatus({ status }: { status: Transaction['status'] }) {
  const style = status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : status === 'CANCELLED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>{status.replaceAll('_', ' ')}</span>
}

function Scanner({ onScan }: { onScan: (token: string) => void }) {
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('transaction-qr-reader', { fps: 10, qrbox: { width: 220, height: 220 } }, false)
    scanner.render((decodedText) => { onScanRef.current(decodedText); void scanner.clear() }, () => undefined)
    return () => { void scanner.clear().catch(() => undefined) }
  }, [])
  return <div id="transaction-qr-reader" className="overflow-hidden rounded-xl border border-slate-200 bg-white" />
}

export function TransactionsPage() {
  const { profile } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [qrValues, setQrValues] = useState<Record<string, string>>({})
  const [token, setToken] = useState('')
  const [scanning, setScanning] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadTransactions() {
    if (!profile) return
    setError('')
    try { setTransactions(await listTransactions(profile.id, profile.role)) } catch (loadError) { console.error(loadError); setError('Transactions could not be loaded. Apply the transaction migration first.') }
  }

  useEffect(() => { void loadTransactions() }, [profile?.id, profile?.role])

  async function issueQr(transactionId: string) {
    setBusyId(transactionId); setError(''); setMessage('')
    try { const value = await issueTransactionQr(transactionId); setQrValues((current) => ({ ...current, [transactionId]: value })); setMessage('QR token generated. Keep it private and show it only at pickup.') } catch (issueError) { console.error(issueError); const rpcError = issueError as { message?: string; details?: string; hint?: string }; const message = [rpcError.message, rpcError.details, rpcError.hint].filter(Boolean).join(' - ') || 'QR code could not be generated.'; setError(message) } finally { setBusyId('') }
  }

  async function verify(tokenValue: string) {
    if (!tokenValue.trim()) return
    setBusyId('verify'); setError(''); setMessage('')
    try { await verifyTransactionQr(tokenValue); setToken(''); setMessage('QR verified successfully. You can now complete the transaction.'); await loadTransactions() } catch (verifyError) { console.error(verifyError); const rpcError = verifyError as { message?: string; details?: string; hint?: string }; const errorMessage = [rpcError.message, rpcError.details, rpcError.hint].filter(Boolean).join(' - ') || 'QR verification failed.'; setError(errorMessage) } finally { setBusyId('') }
  }

  async function complete(transactionId: string) {
    setBusyId(transactionId); setError(''); setMessage('')
    try { await completeTransaction(transactionId); setMessage('Transaction completed successfully.'); await loadTransactions() } catch (completeError) { console.error(completeError); setError('Complete QR verification before completing this transaction.') } finally { setBusyId('') }
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">Exchange tracking</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Transactions</h1><p className="mt-2 text-sm text-slate-600">Use secure QR verification to confirm pickup and complete an exchange.</p></div><Button variant="outline" className="gap-2" onClick={() => void loadTransactions()}><RefreshCw className="h-4 w-4" />Refresh</Button></div>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}

    {(profile?.role === 'PROVIDER' || profile?.role === 'ADMIN') && <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2"><div><div className="flex items-center gap-2"><ScanLine className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-semibold text-slate-900">Verify pickup QR</h2></div><p className="mt-2 text-sm text-slate-600">Scan the seeker&apos;s QR code at pickup, or enter the token manually.</p>{scanning && <div className="mt-4"><Scanner onScan={(value) => void verify(value)} /></div>}<div className="mt-4 flex gap-2"><Button variant="outline" onClick={() => setScanning((value) => !value)}>{scanning ? 'Stop scanner' : 'Open camera scanner'}</Button></div></div><div><label className="text-sm font-medium text-slate-700">Manual QR token<input className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste token only when needed" /></label><Button className="mt-3 w-full" disabled={busyId === 'verify' || !token.trim()} onClick={() => void verify(token)}>Verify token</Button></div></div>}

    {transactions.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><ClipboardCheck className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-medium text-slate-800">No transactions yet</p><p className="mt-1 text-sm text-slate-500">Approved requests will appear here.</p></div>}
    <div className="grid gap-5 lg:grid-cols-2">{transactions.map((transaction) => <article key={transaction.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">{transaction.resource?.title ?? 'Resource exchange'}</p><h2 className="mt-1 text-lg font-semibold text-slate-900">{transaction.quantity} {transaction.resource?.unit ?? 'units'}</h2></div><TransactionStatus status={transaction.status} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-500">Pickup location</p><p className="font-medium text-slate-900">{transaction.pickup_location || transaction.resource?.city || 'To be arranged'}</p></div><div><p className="text-slate-500">Created</p><p className="font-medium text-slate-900">{new Date(transaction.created_at).toLocaleDateString()}</p></div></div>{transaction.status === 'READY_FOR_PICKUP' && qrValues[transaction.id] && <div className="mt-5 flex flex-col items-center rounded-xl bg-slate-50 p-5"><QRCodeSVG value={qrValues[transaction.id]} size={180} includeMargin /><p className="mt-3 text-center text-xs text-slate-500">Show this QR at pickup. Do not share the token publicly.</p></div>}{transaction.status === 'READY_FOR_PICKUP' && !qrValues[transaction.id] && <Button className="mt-5 w-full gap-2" disabled={busyId === transaction.id} onClick={() => void issueQr(transaction.id)}><QrCode className="h-4 w-4" />{busyId === transaction.id ? 'Generating...' : 'Generate pickup QR'}</Button>}{transaction.status === 'VERIFIED' && <Button className="mt-5 w-full gap-2" disabled={busyId === transaction.id} onClick={() => void complete(transaction.id)}><CheckCircle2 className="h-4 w-4" />Complete transaction</Button>}</article>)}</div>
  </div>
}
