import { type ElementType } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import {
  Server,
  Database,
  HardDrive,
  Zap,
  Globe,
  Box,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useIncidentById, useResolveIncident, useUpdateIncident } from '@/api/useThresholds'
import { useOrgMembers } from '@/api/useOrgMembers'
import { useCurrentOrgId } from '@/utils/useCurrentOrgId'
import type { OrgIncident } from '@/api/thresholds'

// ─── Constants ────────────────────────────────────────────────────────────────

const FROM_PATH = '/app/incidents/$incidentId' as const

const SERVICE_ICONS: Record<string, ElementType> = {
  ec2:    Server,
  rds:    Database,
  s3:     HardDrive,
  lambda: Zap,
  elb:    Globe,
}

const SERVICE_LABELS: Record<string, string> = {
  ec2:    'EC2',
  rds:    'RDS',
  s3:     'S3',
  lambda: 'Lambda',
  elb:    'ELB',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

function getDuration(started: string, resolved: string | null): string {
  const end = resolved ? new Date(resolved).getTime() : Date.now()
  const ms = end - new Date(started).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ${mins % 60}m`
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`
}

function getServiceIcon(service: string): ElementType {
  return SERVICE_ICONS[service?.toLowerCase()] ?? Box
}

function getServiceLabel(service: string): string {
  return SERVICE_LABELS[service?.toLowerCase()] ?? service?.toUpperCase() ?? '—'
}

function stateBadgeCls(state: string): string {
  if (state === 'ALARM') return 'border-destructive/30 text-destructive bg-destructive/10'
  return 'border-yellow-500/30 text-yellow-600 bg-yellow-500/10'
}

function priorityBadgeCls(priority: string): string {
  if (priority === 'high') return 'border-destructive/30 text-destructive bg-destructive/10'
  if (priority === 'medium') return 'border-orange-400/30 text-orange-500 bg-orange-400/10'
  return 'border-muted text-muted-foreground bg-muted/40'
}

function statusBadgeCls(status: string): string {
  if (status === 'open') return 'border-destructive/30 text-destructive bg-destructive/10'
  return 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
}

// ─── InfoField ────────────────────────────────────────────────────────────────

interface InfoFieldProps {
  label: string
  value: string
  mono?: boolean
}

function InfoField({ label, value, mono }: InfoFieldProps) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={mono ? 'font-mono text-xs break-all' : 'text-sm'}>{value}</p>
    </div>
  )
}

// ─── ManagementSection ────────────────────────────────────────────────────────

interface ManagementSectionProps {
  incident: OrgIncident
  orgId: string
}

function ManagementSection({ incident, orgId }: ManagementSectionProps) {
  const { data: membersData } = useOrgMembers(orgId)
  const resolveIncident = useResolveIncident(orgId)
  const updateIncident = useUpdateIncident(orgId)

  const members = membersData?.data ?? []
  const isResolved = incident.status === 'resolved'
  const assignedMember = members.find((m) => m.id === incident.assigned_to)

  async function handleResolve() {
    try {
      await resolveIncident.mutateAsync(incident.id)
      toast.success('Incident marked as resolved')
    } catch {
      toast.error('Failed to resolve incident')
    }
  }

  async function handlePriorityChange(priority: string | null) {
    if (!priority) return
    try {
      await updateIncident.mutateAsync({
        incidentId: incident.id,
        body: { priority: priority as OrgIncident['priority'] },
      })
      toast.success('Priority updated')
    } catch {
      toast.error('Failed to update priority')
    }
  }

  async function handleAssigneeChange(value: string | null) {
    const assigned_to = !value || value === 'unassigned' ? null : value
    try {
      await updateIncident.mutateAsync({
        incidentId: incident.id,
        body: { assigned_to },
      })
      toast.success('Assignee updated')
    } catch {
      toast.error('Failed to update assignee')
    }
  }

  const isPriorityPending = updateIncident.isPending
  const isResolvePending = resolveIncident.isPending

  return (
    <div className="rounded-xl border border-border/60 p-5 space-y-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Management</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Resolve */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Status</p>
          {isResolved ? (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle size={14} />
              Resolved
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={isResolvePending}
              onClick={handleResolve}
            >
              {isResolvePending
                ? <Loader2 size={13} className="animate-spin" />
                : <CheckCircle size={13} />
              }
              Mark as Resolved
            </Button>
          )}
        </div>

        {/* Priority */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Priority</p>
          <Select
            value={incident.priority}
            onValueChange={handlePriorityChange}
            disabled={isPriorityPending || isResolved}
          >
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Assignee */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Assigned To
          </p>
          <Select
            value={incident.assigned_to ?? 'unassigned'}
            onValueChange={handleAssigneeChange}
            disabled={isPriorityPending || isResolved}
          >
            <SelectTrigger className="h-8 text-xs w-48">
              <SelectValue>
                {assignedMember ? assignedMember.full_name : 'Unassigned'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </div>
    </div>
  )
}

// ─── IncidentDetailPage ───────────────────────────────────────────────────────

export default function IncidentDetailPage() {
  const { incidentId } = useParams({ from: FROM_PATH })
  const orgId = useCurrentOrgId()

  const { data: incident, isLoading, isError, refetch } = useIncidentById(orgId, incidentId)

  if (!orgId || isLoading) {
    return <LoadingSpinner className="py-32" />
  }

  if (isError || !incident) {
    return (
      <div className="space-y-4">
        <Link to="/incidents" search={{ offset: 0 }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ArrowLeft size={14} />
          Incidents
        </Link>
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          <AlertCircle size={15} className="shrink-0" />
          <span>Failed to load incident.</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const ServiceIcon = getServiceIcon(incident.resource_service)
  const serviceLabel = getServiceLabel(incident.resource_service)
  const sCls = stateBadgeCls(incident.state)
  const pCls = priorityBadgeCls(incident.priority)
  const stCls = statusBadgeCls(incident.status)
  const stateText = incident.state === 'ALARM' ? 'Alarm' : 'Insufficient Data'
  const duration = getDuration(incident.started_at, incident.resolved_at)
  const rawJson = incident.raw_payload != null
    ? JSON.stringify(incident.raw_payload, null, 2)
    : null

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/incidents" search={{ offset: 0 }} className="hover:text-foreground transition-colors duration-150">
          Incidents
        </Link>
        <span>/</span>
        <span className="text-foreground font-mono text-xs">{incident.id}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge variant="outline" className={`text-xs capitalize ${stCls}`}>
              {incident.status}
            </Badge>
            <Badge variant="outline" className={`text-xs ${sCls}`}>
              {stateText}
            </Badge>
            <Badge variant="outline" className={`text-xs capitalize ${pCls}`}>
              {incident.priority}
            </Badge>
            {incident.status === 'open' && (
              <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                Active · {duration}
              </span>
            )}
          </div>
          <h1 className="text-xl font-semibold">{incident.metric_name}</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          render={<Link to="/incidents" search={{ offset: 0 }} />}
        >
          <ArrowLeft size={14} />
          Back
        </Button>
      </div>

      {/* Management */}
      <ManagementSection incident={incident} orgId={orgId} />

      {/* Alert Details */}
      <div className="rounded-xl border border-border/60 p-5 space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alert Details</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoField label="State" value={stateText} />
          <InfoField label="Metric" value={incident.metric_name} />
          <InfoField label="Threshold Value" value={String(incident.threshold_value)} />
          <InfoField
            label="Alarm ARN"
            value={incident.alarm_arn ?? 'Not linked'}
            mono={!!incident.alarm_arn}
          />
          <InfoField label="Duration" value={duration} />
          <InfoField label="Recorded" value={formatDateTime(incident.created_at)} />
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-border/60 p-5 space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Timeline</p>
        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Started" value={formatDateTime(incident.started_at)} />
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Resolved</p>
            {incident.resolved_at
              ? <p className="text-sm">{formatDateTime(incident.resolved_at)}</p>
              : <p className="text-sm text-destructive font-medium">Unresolved</p>
            }
          </div>
        </div>
      </div>

      {/* Resource & Account */}
      <div className="rounded-xl border border-border/60 p-5 space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Resource</p>
            <Link
              to="/cloud-accounts/$accountId/resources"
              params={{ accountId: incident.cloud_account_id }}
              search={{ service: incident.resource_service, region: incident.resource_region, status: '', q: incident.resource_name, offset: 0 }}
              className="flex items-center gap-1 text-sm text-primary hover:underline w-fit"
            >
              <ServiceIcon size={13} />
              {incident.resource_name || incident.resource_id}
              <ExternalLink size={11} />
            </Link>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Service</p>
            <span className="flex items-center gap-1.5 text-sm">
              <ServiceIcon size={13} className="text-muted-foreground" />
              {serviceLabel}
            </span>
          </div>
          <InfoField label="Region" value={incident.resource_region} />
          <InfoField label="Account" value={incident.account_name} />
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Account ID</p>
            <p className="font-mono text-xs break-all">{incident.cloud_account_id}</p>
          </div>
        </div>
      </div>

      {/* Raw Payload */}
      {rawJson && (
        <div className="rounded-xl border border-border/60 p-5 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Raw Payload</p>
          <Separator />
          <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
            {rawJson}
          </pre>
        </div>
      )}
    </div>
  )
}
