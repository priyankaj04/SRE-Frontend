import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Plus,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Cloud,
  Loader2,
  CheckCircle2,
  XCircle,
  LayoutList,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { extractApiError } from '@/utils/error'
import {
  useCloudAccounts,
  useAddCloudAccount,
  useDeleteCloudAccount,
  useValidateCloudAccount,
  useTriggerSync,
  useSyncPoller,
} from '@/api/useCloudAccounts'
import type {
  CloudAccount,
  AuthType,
  SyncStatus,
  ValidateResult,
  CreateCloudAccountPayload,
} from '@/api/cloudAccounts'

// ─── Constants ────────────────────────────────────────────────────────────────

const AWS_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-central-1', 'ap-south-1', 'ap-southeast-1', 'ap-northeast-1',
] as const

const SYNC_BADGE: Record<SyncStatus, { label: string; cls: string; spin: boolean }> = {
  idle:    { label: 'Idle',    cls: 'border-border/60 text-muted-foreground bg-muted/50',        spin: false },
  syncing: { label: 'Syncing', cls: 'border-yellow-500/30 text-yellow-600 bg-yellow-500/10',    spin: true  },
  done:    { label: 'Synced',  cls: 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10', spin: false },
  failed:  { label: 'Failed',  cls: 'border-destructive/30 text-destructive bg-destructive/10', spin: false },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function computeLiveStatus(
  base: SyncStatus,
  polling: boolean,
  jobStatus: string | undefined,
): SyncStatus {
  if (!polling) return base
  if (!jobStatus || jobStatus === 'waiting' || jobStatus === 'active' || jobStatus === 'queued') return 'syncing'
  if (jobStatus === 'completed') return 'done'
  if (jobStatus === 'failed') return 'failed'
  return 'syncing'
}

function regionBtnCls(selected: boolean): string {
  return selected
    ? 'text-xs px-2 py-1 rounded-md border border-primary/40 bg-primary/10 text-primary transition-colors duration-150'
    : 'text-xs px-2 py-1 rounded-md border border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground transition-colors duration-150'
}

function authTypeBtnCls(active: boolean): string {
  return active
    ? 'flex-1 py-1.5 text-xs font-medium bg-primary/10 text-primary transition-colors duration-150'
    : 'flex-1 py-1.5 text-xs font-medium bg-background text-muted-foreground hover:bg-accent/50 transition-colors duration-150'
}

// ─── AccountCard ──────────────────────────────────────────────────────────────

interface AccountCardProps {
  account: CloudAccount
  onDeleteRequest: (account: CloudAccount) => void
}

function AccountCard({ account, onDeleteRequest }: AccountCardProps) {
  const qc = useQueryClient()
  const [jobId, setJobId] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null)

  const validateMutation = useValidateCloudAccount()
  const syncMutation = useTriggerSync()
  const { data: pollData } = useSyncPoller(account.id, jobId, isPolling)

  useEffect(() => {
    if (!pollData?.status) return
    if (pollData.status === 'completed' || pollData.status === 'failed') {
      setIsPolling(false)
      setJobId(null)
      qc.invalidateQueries({ queryKey: ['cloud-accounts'] })
      if (pollData.status === 'completed') {
        toast.success(`${account.name} synced successfully`)
      } else {
        toast.error(`Sync failed: ${pollData.failReason ?? 'Unknown error'}`)
      }
    }
  }, [pollData?.status, account.name, qc])

  async function handleValidate() {
    setValidateResult(null)
    try {
      const result = await validateMutation.mutateAsync(account.id)
      setValidateResult(result)
      if (result.valid) {
        toast.success('Credentials are valid')
      } else {
        toast.error(result.error ?? 'Validation failed')
      }
    } catch (err) {
      toast.error(extractApiError(err, 'Network error — please try again'))
    }
  }

  async function handleSync() {
    try {
      const job = await syncMutation.mutateAsync(account.id)
      if (job.jobId) {
        setJobId(job.jobId)
        setIsPolling(true)
        toast.info('Sync started')
      } else {
        toast.info('Sync queued')
      }
    } catch (err) {
      toast.error(extractApiError(err, 'Network error — please try again'))
    }
  }

  // Computed values (above return — no logic in JSX)
  const liveStatus = computeLiveStatus(account.sync_status, isPolling, pollData?.status)
  const badge = SYNC_BADGE[liveStatus]
  const regions = account.regions?.length > 0 ? account.regions.join(', ') : '—'
  const lastSynced = formatRelativeTime(account.last_synced_at)
  const isValidating = validateMutation.isPending
  const isSyncing = syncMutation.isPending || isPolling
  const isBusy = isValidating || isSyncing
  const hasValidateResult = validateResult !== null
  const validateValid = validateResult?.valid ?? false
  const validateResultCls = validateValid
    ? 'flex items-start gap-2 text-xs px-3 py-2 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 transition-all duration-200'
    : 'flex items-start gap-2 text-xs px-3 py-2 rounded-md bg-destructive/10 text-destructive border border-destructive/20 transition-all duration-200'

  return (
    <Card className="transition-shadow duration-200 hover:shadow-sm">
      <CardContent className="space-y-3">
        {/* Main info row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Cloud size={15} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{account.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {account.provider} · {account.auth_type} · {regions}
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{account.credential_display}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Last synced: {lastSynced}</p>
            </div>
          </div>

          <Badge variant="outline" className={`${badge.cls} gap-1 shrink-0 transition-colors duration-300`}>
            {badge.spin && <Loader2 size={10} className="animate-spin" />}
            {badge.label}
          </Badge>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            disabled={isBusy}
            onClick={handleValidate}
          >
            {isValidating ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
            Validate
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            disabled={isBusy}
            onClick={handleSync}
          >
            {isSyncing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            Sync
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground transition-colors duration-150"
            render={
              <Link
                to="/cloud-accounts/$accountId/resources"
                params={{ accountId: account.id }}
                search={{ service: '', region: '', status: '', q: '', offset: 0 }}
              />
            }
          >
            <LayoutList size={11} />
            Resources
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 ml-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-150"
            disabled={isSyncing}
            onClick={() => onDeleteRequest(account)}
          >
            <Trash2 size={13} />
          </Button>
        </div>

        {/* Validate result */}
        {hasValidateResult && (
          <div className={validateResultCls}>
            {validateValid ? (
              <>
                <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
                <span>
                  Valid — Account <strong>{validateResult!.accountId}</strong>
                  {validateResult!.arn && (
                    <> · <span className="font-mono break-all">{validateResult!.arn}</span></>
                  )}
                </span>
              </>
            ) : (
              <>
                <XCircle size={13} className="shrink-0 mt-0.5" />
                <span>{validateResult!.error ?? 'Invalid credentials'}</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── AddAccountModal ──────────────────────────────────────────────────────────

interface FormState {
  name: string
  authType: AuthType
  accessKeyId: string
  secretAccessKey: string
  roleArn: string
  externalId: string
  regions: string[]
}

interface FormErrors {
  name?: string
  accessKeyId?: string
  secretAccessKey?: string
  roleArn?: string
}

const INITIAL_FORM: FormState = {
  name: '',
  authType: 'access_key',
  accessKeyId: '',
  secretAccessKey: '',
  roleArn: '',
  externalId: '',
  regions: [],
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.name.trim()) errors.name = 'Name is required'
  if (form.authType === 'access_key') {
    if (!form.accessKeyId.trim()) errors.accessKeyId = 'Access Key ID is required'
    if (!form.secretAccessKey.trim()) errors.secretAccessKey = 'Secret Access Key is required'
  } else {
    if (!form.roleArn.trim()) errors.roleArn = 'Role ARN is required'
  }
  return errors
}

interface AddAccountModalProps {
  open: boolean
  onClose: () => void
}

function AddAccountModal({ open, onClose }: AddAccountModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const addMutation = useAddCloudAccount()

  function handleClose() {
    setForm(INITIAL_FORM)
    setErrors({})
    onClose()
  }

  function toggleRegion(region: string) {
    setForm((prev) => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter((r) => r !== region)
        : [...prev.regions, region],
    }))
  }

  async function handleSubmit() {
    const errs = validateForm(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})

    const credentials =
      form.authType === 'access_key'
        ? { accessKeyId: form.accessKeyId, secretAccessKey: form.secretAccessKey }
        : { roleArn: form.roleArn, ...(form.externalId ? { externalId: form.externalId } : {}) }

    const payload: CreateCloudAccountPayload = {
      name: form.name.trim(),
      provider: 'aws',
      authType: form.authType,
      credentials,
      ...(form.regions.length > 0 ? { regions: form.regions } : {}),
    }

    try {
      await addMutation.mutateAsync(payload)
      toast.success('Cloud account added')
      handleClose()
    } catch (err) {
      toast.error(extractApiError(err, 'Network error — please try again'))
    }
  }

  // Computed
  const isPending = addMutation.isPending
  const isAccessKey = form.authType === 'access_key'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud size={17} /> Add Cloud Account
          </DialogTitle>
          <DialogDescription>
            Connect an AWS account using access keys or an IAM role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="ca-name">Name</Label>
            <Input
              id="ca-name"
              placeholder="e.g. Production AWS"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              disabled={isPending}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Auth type toggle */}
          <div className="space-y-1.5">
            <Label>Auth Type</Label>
            <div className="flex rounded-md border border-border/60 overflow-hidden">
              <button
                type="button"
                className={authTypeBtnCls(isAccessKey)}
                disabled={isPending}
                onClick={() => setForm((p) => ({ ...p, authType: 'access_key' }))}
              >
                Access Key
              </button>
              <button
                type="button"
                className={authTypeBtnCls(!isAccessKey)}
                disabled={isPending}
                onClick={() => setForm((p) => ({ ...p, authType: 'role_arn' }))}
              >
                Role ARN
              </button>
            </div>
          </div>

          {/* Credential fields — access_key */}
          {isAccessKey && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="ca-key-id">Access Key ID</Label>
                <Input
                  id="ca-key-id"
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  value={form.accessKeyId}
                  onChange={(e) => setForm((p) => ({ ...p, accessKeyId: e.target.value }))}
                  disabled={isPending}
                />
                {errors.accessKeyId && <p className="text-xs text-destructive">{errors.accessKeyId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ca-secret">Secret Access Key</Label>
                <Input
                  id="ca-secret"
                  type="password"
                  placeholder="wJalrXUtnFEMI..."
                  value={form.secretAccessKey}
                  onChange={(e) => setForm((p) => ({ ...p, secretAccessKey: e.target.value }))}
                  disabled={isPending}
                />
                {errors.secretAccessKey && <p className="text-xs text-destructive">{errors.secretAccessKey}</p>}
              </div>
            </>
          )}

          {/* Credential fields — role_arn */}
          {!isAccessKey && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="ca-role-arn">Role ARN</Label>
                <Input
                  id="ca-role-arn"
                  placeholder="arn:aws:iam::123456789012:role/SRERole"
                  value={form.roleArn}
                  onChange={(e) => setForm((p) => ({ ...p, roleArn: e.target.value }))}
                  disabled={isPending}
                />
                {errors.roleArn && <p className="text-xs text-destructive">{errors.roleArn}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ca-ext-id">
                  External ID{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="ca-ext-id"
                  placeholder="optional-string"
                  value={form.externalId}
                  onChange={(e) => setForm((p) => ({ ...p, externalId: e.target.value }))}
                  disabled={isPending}
                />
              </div>
            </>
          )}

          {/* Regions */}
          <div className="space-y-1.5">
            <Label>
              Regions{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {AWS_REGIONS.map((region) => (
                <button
                  key={region}
                  type="button"
                  disabled={isPending}
                  className={regionBtnCls(form.regions.includes(region))}
                  onClick={() => toggleRegion(region)}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Add Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── CloudAccountsPage ────────────────────────────────────────────────────────

export default function CloudAccountsPage() {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CloudAccount | null>(null)

  const { data: accounts, isLoading, isError } = useCloudAccounts()
  const deleteMutation = useDeleteCloudAccount()

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success(`${deleteTarget.name} deleted`)
      setDeleteTarget(null)
    } catch (err) {
      toast.error(extractApiError(err, 'Network error — please try again'))
    }
  }

  // Computed
  const isEmpty = !isLoading && !isError && accounts?.length === 0

  const addButton = (
    <Button size="sm" className="gap-1.5" onClick={() => setAddModalOpen(true)}>
      <Plus size={14} />
      Add Account
    </Button>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cloud Accounts"
        description="Manage AWS cloud accounts connected to your organisation"
        action={addButton}
      />

      {isLoading && <LoadingSpinner />}

      {isError && (
        <div className="text-sm text-destructive">Failed to load cloud accounts.</div>
      )}

      {isEmpty && (
        <EmptyState
          icon={Cloud}
          title="No cloud accounts yet"
          description="Add an AWS account to get started"
        />
      )}

      {accounts && accounts.length > 0 && (
        <div className="space-y-3">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onDeleteRequest={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <AddAccountModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={<span className="flex items-center gap-2"><Trash2 size={17} /> Delete Cloud Account</span>}
        description={<>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will permanently remove the account and its credentials.</>}
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
