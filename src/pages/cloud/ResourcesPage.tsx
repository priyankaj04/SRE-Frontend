import { useState, useEffect, useRef, type ElementType } from 'react'
import { Link, useParams, useSearch, useNavigate } from '@tanstack/react-router'
import {
  Server,
  Database,
  HardDrive,
  Zap,
  Globe,
  Box,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  Bell,
  Activity,
  Pencil,
  Trash2,
  Check,
  X as XIcon,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useResources, useTriggerSync } from '@/api/useCloudAccounts'
import { useThresholds, useUpdateThreshold, useDeleteThreshold, useIncidents } from '@/api/useThresholds'
import type { Resource } from '@/api/cloudAccounts'
import type { Threshold } from '@/api/thresholds'
import { useDebounce } from '@/utils/useDebounce'

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 20

const FROM_PATH = '/app/cloud-accounts/$accountId/resources' as const
const NAV_PATH  = '/cloud-accounts/$accountId/resources'      as const

const SERVICE_LABELS: Record<string, string> = {
  ec2: 'EC2',
  rds: 'RDS',
  s3: 'S3',
  lambda: 'Lambda',
  elb: 'ELB',
}

const SERVICE_ICONS: Record<string, ElementType> = {
  ec2: Server,
  rds: Database,
  s3: HardDrive,
  lambda: Zap,
  elb: Globe,
}

const STATUS_OPTIONS = [
  'running', 'stopped', 'available', 'pending',
  'failed', 'terminated', 'creating', 'deleting',
]

const OPERATOR_OPTIONS = [
  { value: 'GreaterThanThreshold',            label: '> Greater Than' },
  { value: 'GreaterThanOrEqualToThreshold',   label: '>= Greater Than or Equal' },
  { value: 'LessThanThreshold',               label: '< Less Than' },
  { value: 'LessThanOrEqualToThreshold',      label: '<= Less Than or Equal' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { error?: { message?: string } } } }).response
    return res?.data?.error?.message ?? 'Something went wrong'
  }
  return 'Network error — please try again'
}

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

function getServiceIcon(service: string): ElementType {
  return SERVICE_ICONS[service.toLowerCase()] ?? Box
}

function getServiceLabel(service: string): string {
  return SERVICE_LABELS[service.toLowerCase()] ?? service.toUpperCase()
}

function statusBadgeCls(status: string): string {
  const s = status?.toLowerCase()
  if (['running', 'active', 'available', 'healthy', 'ok', 'in-use'].includes(s)) {
    return 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
  }
  if (['stopped', 'idle', 'inactive'].includes(s)) {
    return 'border-border/60 text-muted-foreground bg-muted/50'
  }
  if (['failed', 'error', 'unhealthy', 'terminated', 'deleting'].includes(s)) {
    return 'border-destructive/30 text-destructive bg-destructive/10'
  }
  return 'border-yellow-500/30 text-yellow-600 bg-yellow-500/10'
}

function formatOperator(op: string): string {
  const map: Record<string, string> = {
    GreaterThanThreshold:          '>',
    GreaterThanOrEqualToThreshold: '>=',
    LessThanThreshold:             '<',
    LessThanOrEqualToThreshold:    '<=',
  }
  return map[op] ?? op
}

function formatPeriod(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return `${seconds / 60}m`
}

function tabBtnCls(active: boolean): string {
  return `px-3 py-2 text-sm transition-colors duration-150 border-b-2 ${
    active
      ? 'border-primary text-foreground font-medium'
      : 'border-transparent text-muted-foreground hover:text-foreground'
  }`
}

function alarmDotCls(alarmName: string | null): string {
  return alarmName ? 'bg-emerald-500' : 'bg-muted-foreground/40'
}

function incidentStateBadgeCls(state: string): string {
  if (state === 'ALARM') return 'border-destructive/30 text-destructive bg-destructive/10'
  return 'border-yellow-500/30 text-yellow-600 bg-yellow-500/10'
}

function getServiceMetaFields(resource: Resource): Array<{ label: string; value: string }> {
  const m = resource.metadata
  const s = resource.service.toLowerCase()
  if (s === 'ec2') return [
    { label: 'Instance Type',     value: m.instance_type     != null ? String(m.instance_type)     : '—' },
    { label: 'VPC ID',            value: m.vpc_id            != null ? String(m.vpc_id)            : '—' },
    { label: 'Private IP',        value: m.private_ip        != null ? String(m.private_ip)        : '—' },
    { label: 'Public IP',         value: m.public_ip         != null ? String(m.public_ip)         : '—' },
    { label: 'Availability Zone', value: m.availability_zone != null ? String(m.availability_zone) : '—' },
  ]
  if (s === 'rds') return [
    { label: 'Engine',   value: m.engine           != null ? String(m.engine)           : '—' },
    { label: 'Class',    value: m.db_instance_class != null ? String(m.db_instance_class) : '—' },
    { label: 'Endpoint', value: m.endpoint          != null ? String(m.endpoint)          : '—' },
    { label: 'Port',     value: m.port              != null ? String(m.port)              : '—' },
    { label: 'Multi-AZ', value: m.multi_az          != null ? String(m.multi_az)          : '—' },
  ]
  if (s === 's3') return [
    { label: 'Creation Date', value: m.creation_date != null ? String(m.creation_date) : '—' },
  ]
  if (s === 'lambda') return [
    { label: 'Runtime', value: m.runtime   != null ? String(m.runtime)              : '—' },
    { label: 'Memory',  value: m.memory_mb != null ? `${String(m.memory_mb)} MB`    : '—' },
    { label: 'Timeout', value: m.timeout_s != null ? `${String(m.timeout_s)}s`      : '—' },
  ]
  if (s === 'elb') return [
    { label: 'Type',     value: m.type     != null ? String(m.type)     : '—' },
    { label: 'Scheme',   value: m.scheme   != null ? String(m.scheme)   : '—' },
    { label: 'DNS Name', value: m.dns_name != null ? String(m.dns_name) : '—' },
  ]
  return []
}

// ─── ThresholdsTab ────────────────────────────────────────────────────────────

interface ThresholdsTabProps {
  accountId: string
  resourceId: string
}

function ThresholdsTab({ accountId, resourceId }: ThresholdsTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    operator: '',
    threshold_value: 0,
    evaluation_periods: 1,
    period: 300,
    sns_topic_arn: '',
  })

  const { data: thresholds = [], isLoading } = useThresholds(accountId, resourceId)
  const updateMutation = useUpdateThreshold(accountId, resourceId)
  const deleteMutation = useDeleteThreshold(accountId, resourceId)

  function startEdit(t: Threshold) {
    setDeleteConfirmId(null)
    setEditingId(t.id)
    setEditForm({
      operator: t.operator,
      threshold_value: t.threshold_value,
      evaluation_periods: t.evaluation_periods,
      period: t.period,
      sns_topic_arn: t.sns_topic_arn ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleSave() {
    if (!editingId) return
    try {
      const result = await updateMutation.mutateAsync({
        thresholdId: editingId,
        body: {
          operator: editForm.operator,
          threshold_value: editForm.threshold_value,
          evaluation_periods: editForm.evaluation_periods,
          period: editForm.period,
          sns_topic_arn: editForm.sns_topic_arn || null,
        },
      })
      setEditingId(null)
      toast.success('Threshold updated')
      if (!result.alarm_name) {
        toast.warning('No CloudWatch alarm linked — changes won\'t take effect until an alarm is connected')
      }
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  async function handleDelete() {
    if (!deleteConfirmId) return
    try {
      await deleteMutation.mutateAsync(deleteConfirmId)
      setDeleteConfirmId(null)
      toast.success('Threshold deleted')
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (thresholds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center mb-2">
          <Bell size={16} className="text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No thresholds configured</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Metric</TableHead>
              <TableHead className="w-20">Condition</TableHead>
              <TableHead className="w-20">Check</TableHead>
              <TableHead className="w-32">Alarm</TableHead>
              <TableHead className="w-14" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {thresholds.map((t) => {
              const isEditing = editingId === t.id
              return (
                <TableRow key={t.id} className={isEditing ? 'bg-muted/20' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{t.metric_name}</span>
                      {t.is_default && (
                        <Badge
                          variant="outline"
                          className="text-xs h-4 px-1 border-primary/30 text-primary bg-primary/5"
                        >
                          default
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {formatOperator(t.operator)} {t.threshold_value}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.evaluation_periods}× {formatPeriod(t.period)}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${alarmDotCls(t.alarm_name)}`} />
                      {t.alarm_name
                        ? <span className="truncate max-w-20">{t.alarm_name}</span>
                        : 'Not linked'
                      }
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => isEditing ? cancelEdit() : startEdit(t)}
                      >
                        {isEditing ? <XIcon size={12} /> : <Pencil size={12} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteConfirmId(t.id)}
                        disabled={deleteMutation.isPending && deleteConfirmId === t.id}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit form panel */}
      {editingId && (
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3 animate-in fade-in-0 slide-in-from-top-1 duration-150">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Edit Threshold
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Operator</Label>
              <Select
                value={editForm.operator}
                onValueChange={(v) => setEditForm((f) => ({ ...f, operator: v ?? f.operator }))}
              >
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATOR_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Threshold Value</Label>
              <Input
                type="number"
                className="h-7 text-xs"
                value={editForm.threshold_value}
                onChange={(e) => setEditForm((f) => ({ ...f, threshold_value: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Evaluation Periods</Label>
              <Input
                type="number"
                min={1}
                className="h-7 text-xs"
                value={editForm.evaluation_periods}
                onChange={(e) => setEditForm((f) => ({ ...f, evaluation_periods: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Period (seconds)</Label>
              <Input
                type="number"
                min={60}
                step={60}
                className="h-7 text-xs"
                value={editForm.period}
                onChange={(e) => setEditForm((f) => ({ ...f, period: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">SNS Topic ARN</Label>
              <Input
                className="h-7 text-xs"
                placeholder="Optional"
                value={editForm.sns_topic_arn}
                onChange={(e) => setEditForm((f) => ({ ...f, sns_topic_arn: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={updateMutation.isPending}
              onClick={handleSave}
            >
              {updateMutation.isPending
                ? <Loader2 size={11} className="animate-spin" />
                : <Check size={11} />
              }
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirm banner */}
      {deleteConfirmId && !editingId && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 animate-in fade-in-0 duration-150">
          <AlertTriangle size={14} className="text-destructive shrink-0" />
          <span className="text-destructive text-xs flex-1">
            Delete this threshold? This cannot be undone.
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setDeleteConfirmId(null)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-6 text-xs gap-1"
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
          >
            {deleteMutation.isPending && <Loader2 size={11} className="animate-spin" />}
            Delete
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── IncidentsTab ─────────────────────────────────────────────────────────────

interface IncidentsTabProps {
  accountId: string
  resourceId: string
}

function IncidentsTab({ accountId, resourceId }: IncidentsTabProps) {
  const { data: incidents = [], isLoading } = useIncidents(accountId, resourceId)

  const sorted = [...incidents].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center mb-2">
          <Activity size={16} className="text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No incidents recorded</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Metric</TableHead>
            <TableHead className="w-36">State</TableHead>
            <TableHead className="w-28">Started</TableHead>
            <TableHead className="w-28">Resolved</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((incident) => (
            <TableRow key={incident.id}>
              <TableCell>
                <div className="text-sm">{incident.metric_name}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  @ {incident.threshold_value}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-xs ${incidentStateBadgeCls(incident.state)}`}
                >
                  {incident.state === 'ALARM' ? 'Alarm' : 'Insufficient Data'}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatRelativeTime(incident.started_at)}
              </TableCell>
              <TableCell className="text-xs">
                {incident.resolved_at
                  ? <span className="text-muted-foreground">{formatRelativeTime(incident.resolved_at)}</span>
                  : <span className="text-destructive">Unresolved</span>
                }
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── ResourceDetailContent ────────────────────────────────────────────────────

type ActiveTab = 'overview' | 'thresholds' | 'incidents'

interface ResourceDetailContentProps {
  resource: Resource
  accountId: string
}

function ResourceDetailContent({ resource, accountId }: ResourceDetailContentProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')

  const ServiceIcon = getServiceIcon(resource.service)
  const serviceLabel = getServiceLabel(resource.service)
  const sCls = statusBadgeCls(resource.status)
  const metaFields = getServiceMetaFields(resource)
  const metaJson = JSON.stringify(resource.metadata, null, 2)
  const lastSeen = formatRelativeTime(resource.last_seen_at)
  const createdAt = new Date(resource.created_at).toLocaleString()

  return (
    <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 pr-6">
          <ServiceIcon size={16} className="text-muted-foreground shrink-0" />
          <span className="truncate">{resource.name || resource.external_id}</span>
        </DialogTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs gap-1">
            <ServiceIcon size={10} />
            {serviceLabel}
          </Badge>
          <Badge variant="outline" className={`text-xs ${sCls}`}>
            {resource.status}
          </Badge>
        </div>
      </DialogHeader>

      {/* Tab bar */}
      <div className="flex border-b border-border/60 -mt-1">
        <button className={tabBtnCls(activeTab === 'overview')} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button className={tabBtnCls(activeTab === 'thresholds')} onClick={() => setActiveTab('thresholds')}>
          Thresholds
        </button>
        <button className={tabBtnCls(activeTab === 'incidents')} onClick={() => setActiveTab('incidents')}>
          Incidents
        </button>
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">External ID</p>
              <p className="font-mono text-xs break-all">{resource.external_id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Region</p>
              <p>{resource.region}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Last Seen</p>
              <p>{lastSeen}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Discovered</p>
              <p>{createdAt}</p>
            </div>
          </div>

          {metaFields.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  {serviceLabel} Details
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {metaFields.map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                      <p className="font-mono text-xs break-all">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Raw Metadata
            </p>
            <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {metaJson}
            </pre>
          </div>
        </div>
      )}

      {/* Thresholds */}
      {activeTab === 'thresholds' && (
        <ThresholdsTab accountId={accountId} resourceId={resource.id} />
      )}

      {/* Incidents */}
      {activeTab === 'incidents' && (
        <IncidentsTab accountId={accountId} resourceId={resource.id} />
      )}
    </DialogContent>
  )
}

// ─── ResourceDetailDialog ─────────────────────────────────────────────────────

interface ResourceDetailDialogProps {
  resource: Resource | null
  accountId: string
  onClose: () => void
}

function ResourceDetailDialog({ resource, accountId, onClose }: ResourceDetailDialogProps) {
  return (
    <Dialog open={!!resource} onOpenChange={(open) => !open && onClose()}>
      {resource && (
        <ResourceDetailContent key={resource.id} resource={resource} accountId={accountId} />
      )}
    </Dialog>
  )
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><div className="h-4 w-14 bg-muted animate-pulse rounded" /></TableCell>
      <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
      <TableCell><div className="h-4 w-28 bg-muted animate-pulse rounded" /></TableCell>
      <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
      <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
      <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
    </TableRow>
  )
}

// ─── ResourceRow ──────────────────────────────────────────────────────────────

interface ResourceRowProps {
  resource: Resource
  onSelect: (resource: Resource) => void
}

function ResourceRow({ resource, onSelect }: ResourceRowProps) {
  const Icon = getServiceIcon(resource.service)
  const serviceLabel = getServiceLabel(resource.service)
  const sCls = statusBadgeCls(resource.status)
  const lastSeen = formatRelativeTime(resource.last_seen_at)

  return (
    <TableRow className="cursor-pointer" onClick={() => onSelect(resource)}>
      <TableCell>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon size={13} />
          {serviceLabel}
        </span>
      </TableCell>
      <TableCell className="font-medium text-sm max-w-48 truncate">
        {resource.name || '—'}
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground max-w-40 truncate">
        {resource.external_id}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{resource.region}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`text-xs ${sCls}`}>
          {resource.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{lastSeen}</TableCell>
    </TableRow>
  )
}

// ─── ResourcesPage ────────────────────────────────────────────────────────────

export default function ResourcesPage() {
  const { accountId } = useParams({ from: FROM_PATH })
  const { service, region, status, q, offset } = useSearch({ from: FROM_PATH })
  const navigate = useNavigate()

  const [inputValue, setInputValue] = useState(q)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const tableTopRef = useRef<HTMLDivElement>(null)
  const isFirstSearchMount = useRef(true)

  const debouncedSearch = useDebounce(inputValue, 300)

  useEffect(() => {
    if (isFirstSearchMount.current) {
      isFirstSearchMount.current = false
      return
    }
    navigate({
      to: NAV_PATH,
      params: { accountId },
      search: { service, region, status, q: debouncedSearch, offset: 0 },
      replace: true,
    })
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    tableTopRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [offset])

  const queryParams = {
    limit: LIMIT,
    offset,
    service: service || undefined,
    region: region || undefined,
    status: status || undefined,
    search: debouncedSearch || undefined,
  }

  const { data, isLoading, isError, refetch } = useResources(accountId, queryParams)
  const syncMutation = useTriggerSync()

  function setServiceFilter(value: string | null) {
    navigate({
      to: NAV_PATH,
      params: { accountId },
      search: { service: value ?? '', region, status, q, offset: 0 },
      replace: true,
    })
  }

  function setRegionFilter(value: string | null) {
    navigate({
      to: NAV_PATH,
      params: { accountId },
      search: { service, region: value ?? '', status, q, offset: 0 },
      replace: true,
    })
  }

  function setStatusFilter(value: string | null) {
    navigate({
      to: NAV_PATH,
      params: { accountId },
      search: { service, region, status: value ?? '', q, offset: 0 },
      replace: true,
    })
  }

  function setPage(newOffset: number) {
    navigate({
      to: NAV_PATH,
      params: { accountId },
      search: { service, region, status, q, offset: newOffset },
      replace: true,
    })
  }

  async function handleSync() {
    try {
      await syncMutation.mutateAsync(accountId)
      toast.info('Sync started — check back shortly for results')
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  // Computed values
  const resources = data?.data ?? []
  const pagination = data?.pagination
  const total = pagination?.total ?? 0
  const hasMore = pagination?.hasMore ?? false
  const currentStart = total === 0 ? 0 : offset + 1
  const currentEnd = Math.min(offset + LIMIT, total)
  const hasFilters = !!(service || region || status || debouncedSearch)
  const isEmpty = !isLoading && !isError && resources.length === 0
  const canGoPrev = offset > 0
  const canGoNext = hasMore || offset + LIMIT < total

  const serviceCounts = resources.reduce<Record<string, number>>((acc, r) => {
    const svc = r.service.toLowerCase()
    acc[svc] = (acc[svc] ?? 0) + 1
    return acc
  }, {})
  const serviceCountEntries = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])

  const uniqueRegions = [...new Set([
    ...resources.map((r) => r.region),
    ...(region ? [region] : []),
  ])].sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link
              to="/cloud-accounts"
              className="hover:text-foreground transition-colors duration-150"
            >
              Cloud Accounts
            </Link>
            <span>/</span>
            <span className="text-foreground">Resources</span>
          </div>
          <h1 className="text-xl font-semibold">Discovered Resources</h1>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={syncMutation.isPending}
          onClick={handleSync}
        >
          {syncMutation.isPending
            ? <Loader2 size={14} className="animate-spin" />
            : <RefreshCw size={14} />
          }
          Sync
        </Button>
      </div>

      {/* Summary bar */}
      {!isLoading && !isError && total > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 rounded-lg bg-muted/40 border border-border/60 text-sm">
          <span className="font-medium">{total} resources</span>
          {serviceCountEntries.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-4 hidden sm:block" />
              <div className="flex flex-wrap items-center gap-3">
                {serviceCountEntries.map(([svc, count]) => {
                  const Icon = getServiceIcon(svc)
                  const label = getServiceLabel(svc)
                  return (
                    <span key={svc} className="flex items-center gap-1 text-muted-foreground">
                      <Icon size={13} />
                      {label}: <strong className="text-foreground ml-0.5">{count}</strong>
                    </span>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Filters */}
      <div ref={tableTopRef} className="flex flex-wrap items-center gap-2">
        <Select value={service || 'all'} onValueChange={(v) => setServiceFilter(v === 'all' ? '' : v)}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="ec2">EC2</SelectItem>
            <SelectItem value="rds">RDS</SelectItem>
            <SelectItem value="s3">S3</SelectItem>
            <SelectItem value="lambda">Lambda</SelectItem>
            <SelectItem value="elb">ELB</SelectItem>
          </SelectContent>
        </Select>

        <Select value={region || 'all'} onValueChange={(v) => setRegionFilter(v === 'all' ? '' : v)}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {uniqueRegions.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-7 h-7 text-xs"
            placeholder="Search by name or ID…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>
      </div>

      {/* Error */}
      {isError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          <AlertCircle size={15} className="shrink-0" />
          <span>Failed to load resources.</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      {!isError && (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-24">Service</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>External ID</TableHead>
                <TableHead className="w-28">Region</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-28">Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} />)
                : resources.map((resource) => (
                    <ResourceRow
                      key={resource.id}
                      resource={resource}
                      onSelect={setSelectedResource}
                    />
                  ))
              }
            </TableBody>
          </Table>

          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <Box size={18} className="text-muted-foreground" />
              </div>
              {hasFilters ? (
                <>
                  <p className="text-sm font-medium">No resources match your filters</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try adjusting or clearing the filters above
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">No resources found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Trigger a sync to discover resources
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 gap-1.5"
                    disabled={syncMutation.isPending}
                    onClick={handleSync}
                  >
                    {syncMutation.isPending
                      ? <Loader2 size={13} className="animate-spin" />
                      : <RefreshCw size={13} />
                    }
                    Sync Now
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !isError && total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {currentStart}–{currentEnd} of {total}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={!canGoPrev}
              onClick={() => setPage(Math.max(0, offset - LIMIT))}
            >
              <ChevronLeft size={13} /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={!canGoNext}
              onClick={() => setPage(offset + LIMIT)}
            >
              Next <ChevronRight size={13} />
            </Button>
          </div>
        </div>
      )}

      <ResourceDetailDialog
        resource={selectedResource}
        accountId={accountId}
        onClose={() => setSelectedResource(null)}
      />
    </div>
  )
}
