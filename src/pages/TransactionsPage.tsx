import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, CheckCircle2, ClipboardCheck, QrCode, RefreshCw, ScanLine, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

import { Button } from '../components/ui/button'
import { useAuth } from '../features/auth/AuthContext'
import { completeTransaction, issueTransactionQr, listTransactions, verifyTransactionQr, type Transaction, type VerifiedTransaction } from '../services/transactionService'

function TransactionStatus({ status }: { status: Transaction['status'] }) {
  const style = status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : status === 'CANCELLED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>{status.replaceAll('_', ' ')}</span>
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return fallback
}

function getCameraErrorMessage(error: unknown) {
  const name = error instanceof Error
    ? error.name
    : typeof error === 'object' && error !== null && 'name' in error && typeof error.name === 'string'
      ? error.name
      : ''
  const message = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
        ? error.message
        : ''
  const details = `${name} ${message}`.toLowerCase()

  if (details.includes('notallowederror') || details.includes('permissiondenied') || details.includes('permission denied') || details.includes('not allowed')) {
    return `Camera access is blocked for this site. In Chrome, open Site settings for ${window.location.host}, set Camera to Allow, then refresh SUREN.`
  }
  if (details.includes('notfounderror') || details.includes('devicesnotfound') || details.includes('no camera')) {
    return 'No camera was found. Connect a camera or enter the seeker’s QR token manually.'
  }
  if (details.includes('notreadableerror') || details.includes('trackstarterror') || details.includes('device in use') || details.includes('could not start video source')) {
    return 'The camera is busy or unavailable. Close other apps or tabs using it, then try again.'
  }
  return message ? `Camera could not start: ${message}` : 'Camera could not start. Check Chrome camera permissions and confirm a camera is connected.'
}

function shouldFallbackToAvailableCamera(error: unknown) {
  const details = error instanceof Error
    ? `${error.name} ${error.message}`
    : typeof error === 'string'
      ? error
      : typeof error === 'object' && error !== null
        ? `${'name' in error && typeof error.name === 'string' ? error.name : ''} ${'message' in error && typeof error.message === 'string' ? error.message : ''}`
        : ''
  return /overconstrained|notfound|devicesnotfound|facingmode/i.test(details)
}

function Scanner({ onScan }: { onScan: (token: string) => void }) {
  const [cameraError, setCameraError] = useState('')
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'running'>('idle')
  const mountedRef = useRef(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      const scanner = scannerRef.current
      scannerRef.current = null
      if (!scanner) return
      if (scanner.isScanning) {
        void scanner.stop()
          .then(() => scanner.clear())
          .catch((error: unknown) => console.error('Unable to stop QR camera during cleanup', error))
      } else {
        scanner.clear()
      }
    }
  }, [])

  async function stopCamera() {
    const scanner = scannerRef.current
    scannerRef.current = null
    if (!scanner) {
      setCameraState('idle')
      return
    }
    try {
      if (scanner.isScanning) await scanner.stop()
      scanner.clear()
      setCameraState('idle')
    } catch (error) {
      console.error('Unable to stop QR camera', error)
      setCameraError('The camera could not be stopped. Close this page to release the camera.')
    }
  }

  async function startCamera() {
    setCameraError('')
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access requires a secure connection. Open SUREN using HTTPS or localhost.')
      return
    }

    setCameraState('starting')
    const scanner = new Html5Qrcode('transaction-qr-reader', {
      verbose: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    })
    scannerRef.current = scanner

    try {
      const scanConfig = {
        fps: 10,
        qrbox: (width: number, height: number) => {
          const size = Math.floor(Math.min(width, height, 280) * 0.8)
          return { width: size, height: size }
        },
      }
      const handleDecodedQr = (decodedText: string) => {
        void stopCamera()
        onScanRef.current(decodedText)
      }

      try {
        await scanner.start(
          { facingMode: { exact: 'environment' } },
          scanConfig,
          handleDecodedQr,
          () => undefined,
        )
      } catch (cameraConstraintError) {
        if (!shouldFallbackToAvailableCamera(cameraConstraintError)) throw cameraConstraintError
        const cameras = await Html5Qrcode.getCameras()
        const camera = cameras.find(({ label }) => /back|rear|environment/i.test(label)) ?? cameras[0]
        if (!camera) throw cameraConstraintError
        await scanner.start(camera.id, scanConfig, handleDecodedQr, () => undefined)
      }
      if (!mountedRef.current || scannerRef.current !== scanner) {
        if (scanner.isScanning) await scanner.stop()
        scanner.clear()
        return
      }
      setCameraState('running')
    } catch (error) {
      console.error('Unable to start QR camera', error)
      scanner.clear()
      if (scannerRef.current === scanner) scannerRef.current = null
      if (!mountedRef.current) return
      setCameraState('idle')
      setCameraError(getCameraErrorMessage(error))
    }
  }

  async function scanImage(file: File | undefined) {
    if (!file) return
    setCameraError('')
    const activeScanner = scannerRef.current
    if (activeScanner?.isScanning) {
      try {
        await activeScanner.stop()
      } catch (error) {
        console.error('Unable to stop QR camera before image scan', error)
        setCameraError('Stop the camera before scanning an image.')
        return
      }
    }

    const scanner = new Html5Qrcode('transaction-qr-reader', {
      verbose: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    })
    scannerRef.current = scanner
    try {
      const decodedText = await scanner.scanFile(file, false)
      onScanRef.current(decodedText)
    } catch (error) {
      console.error('Unable to scan QR image', error)
      setCameraError(error instanceof Error ? `Could not read a QR code from this image: ${error.message}` : 'Could not read a QR code from this image.')
    } finally {
      scanner.clear()
      if (scannerRef.current === scanner) scannerRef.current = null
      setCameraState('idle')
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div id="transaction-qr-reader" className="min-h-36 overflow-hidden rounded-xl border border-slate-200 bg-white" />
      {cameraError && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">{cameraError}</p>}
      <div className="flex flex-wrap gap-2">
        {cameraState === 'running'
          ? <Button type="button" variant="outline" onClick={() => void stopCamera()}>Stop camera</Button>
          : <Button type="button" variant="outline" disabled={cameraState === 'starting'} onClick={() => void startCamera()}>
              <Camera className="mr-2 h-4 w-4" />{cameraState === 'starting' ? 'Starting camera...' : 'Allow and start camera'}
            </Button>}
        <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
          Scan an image file
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={cameraState === 'starting'}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              void scanImage(file)
            }}
          />
        </label>
      </div>
      <p className="text-xs text-slate-500">If prompted, allow camera access. You can also paste the QR token or scan an image.</p>
    </div>
  )
}

export function TransactionsPage() {
  const { profile } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [qrValues, setQrValues] = useState<Record<string, { token: string; expiresAt: string }>>({})
  const [token, setToken] = useState('')
  const [scanning, setScanning] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [verified, setVerified] = useState<VerifiedTransaction | null>(null)

  const loadTransactions = useCallback(async () => {
    if (!profile) return
    setError('')
    try {
      setTransactions(await listTransactions(profile.id, profile.role))
    } catch (loadError) {
      console.error('Unable to load transactions', loadError)
      setError('Transactions could not be loaded. Apply the latest SUREN database migrations.')
    }
  }, [profile])

  useEffect(() => { void loadTransactions() }, [loadTransactions])

  async function issueQr(transactionId: string) {
    setBusyId(transactionId)
    setError('')
    setMessage('')
    try {
      const qr = await issueTransactionQr(transactionId)
      setQrValues((current) => ({ ...current, [transactionId]: qr }))
      setMessage('QR token generated. Keep it private and show it only at pickup.')
    } catch (issueError) {
      console.error('Unable to issue transaction QR', issueError)
      setError(issueError instanceof Error ? issueError.message : 'QR code could not be generated.')
    } finally {
      setBusyId('')
    }
  }

  async function verify(tokenValue: string) {
    if (!tokenValue.trim()) return
    setBusyId('verify')
    setError('')
    setMessage('')
    setVerified(null)
    try {
      const result = await verifyTransactionQr(tokenValue)
      setToken('')
      setVerified(result)
      setMessage('QR Verification Successful!')
      await loadTransactions()
    } catch (verifyError) {
      console.error('Unable to verify pickup QR', verifyError)
      setError(getErrorMessage(verifyError, 'QR verification failed. Check the QR code and try again.'))
    } finally {
      setBusyId('')
    }
  }

  async function complete(transactionId: string) {
    setBusyId(transactionId)
    setError('')
    setMessage('')
    try {
      await completeTransaction(transactionId)
      setVerified(null)
      setMessage('Resource handover completed successfully.')
      await loadTransactions()
    } catch (completeError) {
      console.error('Unable to complete handover', completeError)
      setError(completeError instanceof Error ? completeError.message : 'Confirm the verified resource handover again.')
    } finally {
      setBusyId('')
    }
  }

  const canVerify = profile?.role === 'PROVIDER' || profile?.role === 'ADMIN'
  const isSeeker = profile?.role === 'SEEKER'

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">Exchange tracking</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Transactions</h1>
          <p className="mt-2 text-sm text-slate-600">Verify the pickup QR, then confirm handover with the provider.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void loadTransactions()}><RefreshCw className="h-4 w-4" />Refresh</Button>
      </div>
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}
      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{message}</div>}

      {canVerify && (
        <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-2"><ScanLine className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-semibold text-slate-900">Verify Resource Pickup</h2></div>
            <p className="mt-2 text-sm text-slate-600">Scan the seeker&apos;s active QR at pickup. The request owner is checked securely by Supabase.</p>
            {scanning && <Scanner onScan={(value) => void verify(value)} />}
            <Button variant="outline" className="mt-4" onClick={() => setScanning((value) => !value)}>{scanning ? 'Stop scanner' : 'Open camera scanner'}</Button>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Manual QR token<input className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste token only when needed" /></label>
            <Button className="mt-3 w-full" disabled={busyId === 'verify' || !token.trim()} onClick={() => void verify(token)}>Verify token</Button>
          </div>
        </div>
      )}

      {verified && canVerify && (
        <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5" role="status">
          <div className="flex items-center gap-2 text-lg font-bold text-emerald-900"><ShieldCheck className="h-5 w-5" />QR Verification Successful!</div>
          <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <p>Seeker: <strong>{verified.seeker_name}</strong></p>
            <p>Resource: <strong>{verified.resource_title}</strong></p>
            <p>Quantity: <strong>{verified.quantity} {verified.unit}</strong></p>
            <p>Request ID: <strong className="break-all font-mono text-xs">{verified.request_id}</strong></p>
            <p>Provider: <strong>{verified.provider_name}</strong></p>
            <p>Request status: <strong>{verified.request_status}</strong></p>
            <p>Payment: <strong>{verified.payment_status.replaceAll('_', ' ')}</strong></p>
            {verified.total_price !== null && <p>Total price snapshot: <strong>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(verified.total_price)}</strong></p>}
            <p>Token expiry: <strong>{new Date(verified.token_expires_at).toLocaleString('en-IN')}</strong></p>
          </div>
          <Button className="mt-5 gap-2" disabled={busyId === verified.transaction_id} onClick={() => void complete(verified.transaction_id)}>
            <CheckCircle2 className="h-4 w-4" />{busyId === verified.transaction_id ? 'Confirming...' : 'Confirm Resource Handover'}
          </Button>
        </section>
      )}

      {transactions.length === 0 && !error && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><ClipboardCheck className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-medium text-slate-800">No transactions yet</p><p className="mt-1 text-sm text-slate-500">Approved requests will appear here.</p></div>}
      <div className="grid gap-5 lg:grid-cols-2">
        {transactions.map((transaction) => {
          const qr = qrValues[transaction.id]
          return (
            <article key={transaction.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">{transaction.resource?.title ?? 'Resource exchange'}</p><h2 className="mt-1 text-lg font-semibold text-slate-900">{transaction.quantity} {transaction.resource?.unit ?? 'units'}</h2></div>
                <TransactionStatus status={transaction.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-500">Pickup location</p><p className="font-medium text-slate-900">{transaction.pickup_location || transaction.resource?.city || 'To be arranged'}</p></div>
                <div><p className="text-slate-500">Created</p><p className="font-medium text-slate-900">{new Date(transaction.created_at).toLocaleDateString('en-IN')}</p></div>
                <div className="col-span-2"><p className="text-slate-500">Request ID</p><p className="break-all font-mono text-xs text-slate-800">{transaction.request_id}</p></div>
              </div>
              {isSeeker && transaction.status === 'READY_FOR_PICKUP' && qr && <div className="mt-5 flex flex-col items-center rounded-xl bg-slate-50 p-5"><QRCodeSVG value={qr.token} size={180} includeMargin /><p className="mt-3 text-center text-xs text-slate-500">Expires {new Date(qr.expiresAt).toLocaleString('en-IN')}. Show only at pickup.</p></div>}
              {isSeeker && transaction.status === 'READY_FOR_PICKUP' && !qr && <Button className="mt-5 w-full gap-2" disabled={busyId === transaction.id} onClick={() => void issueQr(transaction.id)}><QrCode className="h-4 w-4" />{busyId === transaction.id ? 'Generating...' : 'Generate pickup QR'}</Button>}
              {canVerify && transaction.status === 'VERIFIED' && <Button className="mt-5 w-full gap-2" disabled={busyId === transaction.id} onClick={() => void complete(transaction.id)}><CheckCircle2 className="h-4 w-4" />Confirm Resource Handover</Button>}
            </article>
          )
        })}
      </div>
    </div>
  )
}
