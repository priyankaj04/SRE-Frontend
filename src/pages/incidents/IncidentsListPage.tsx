import { type ElementType } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import {
  Server,
  Database,
  HardDrive,
  Zap,
  Globe,
  Box,
  Activity,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useOrgIncidents } from '@/api/useThresholds'
import type { OrgIncident } from '@/api/thresholds'
import { useCurrentOrgId } from '@/utils/useCurrentOrgId'

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 20

const FROM_PATH = '/app/incidents' as const
const NAV_PATH  = '/incidents'      as const

const SERVICE_ICONS: Record<string, ElementType> = {
  ec2:    Server,
  rds:    Database,
  s3:     HardDrive,
  lambda: Zap,
  elb:    Globe,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getServiceIcon(service: string): ElementType {
  return SERVICE_ICONS[service?.toLowerCase()] ?? Box
}

function stateBadgeCls(state: string): string {
  if (state === 'ALARM') return 'border-destructive/30 text-destructive bg-destructive/10'
  return 'border-yellow-500/30 text-yellow-600 bg-yellow-500/10'
}

function stateLabel(state: string): string {
  if (state === 'ALARM') return 'Alarm'
  return 'Insufficient Data'
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
      <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
      <TableCell><div className="h-4 w-28 bg-muted animate-pulse rounded" /></TableCell>
      <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
      <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
      <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
    </TableRow>
  )
}

// ─── IncidentRow ──────────────────────────────────────────────────────────────

interface IncidentRowProps {
  incident: OrgIncident
}

function IncidentRow({ incident }: IncidentRowProps) {
  const navigate = useNavigate()
  const ServiceIcon = getServiceIcon(incident.resource_service)
  const sCls = stateBadgeCls(incident.state)

  function handleClick() {
    navigate({ to: '/incidents/$incidentId', params: { incidentId: incident.id } })
  }

  return (
    <TableRow className="cursor-pointer" onClick={handleClick}>
      <TableCell>
        <Badge variant="outline" className={`text-xs ${sCls}`}>
          {stateLabel(incident.state)}
        </Badge>
      </TableCell>
      <TableCell className="font-medium text-sm">{incident.metric_name}</TableCell>
      <TableCell>
        <span className="flex items-center gap-1.5 text-sm">
          <ServiceIcon size={13} className="text-muted-foreground shrink-0" />
          <span className="truncate max-w-36">{incident.resource_name || incident.resource_id}</span>
        </span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground truncate max-w-28">
        {incident.account_name}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatRelativeTime(incident.started_at)}
      </TableCell>
      <TableCell className="text-xs">
        {incident.resolved_at
          ? <span className="text-muted-foreground">{formatRelativeTime(incident.resolved_at)}</span>
          : <span className="text-destructive font-medium">Active</span>
        }
      </TableCell>
    </TableRow>
  )
}

// ─── IncidentsListPage ────────────────────────────────────────────────────────

export default function IncidentsListPage() {
  const { offset } = useSearch({ from: FROM_PATH })
  const navigate = useNavigate()
  const orgId = useCurrentOrgId()

  const { data, isLoading, isError, refetch } = useOrgIncidents(orgId, { limit: LIMIT, offset })

  function setPage(newOffset: number) {
    navigate({
      to: NAV_PATH,
      search: { offset: newOffset },
      replace: true,
    })
  }

  // Computed values
  const incidents = data?.data ?? []
  const pagination = data?.pagination
  const total = pagination?.total ?? 0
  const hasMore = pagination?.hasMore ?? false
  const currentStart = total === 0 ? 0 : offset + 1
  const currentEnd = Math.min(offset + LIMIT, total)
  const isEmpty = !isLoading && !isError && incidents.length === 0
  const canGoPrev = offset > 0
  const canGoNext = hasMore || offset + LIMIT < total

  const countLabel = total > 0 ? (
    <span className="text-sm text-muted-foreground mt-1">{total} total</span>
  ) : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incidents"
        description="Alerts fired across all cloud accounts"
        action={countLabel}
      />

      {/* Error */}
      {isError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          <AlertCircle size={15} className="shrink-0" />
          <span>Failed to load incidents.</span>
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
                <TableHead className="w-36">State</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead className="w-32">Account</TableHead>
                <TableHead className="w-28">Started</TableHead>
                <TableHead className="w-28">Resolved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} />)
                : incidents.map((incident) => (
                    <IncidentRow key={incident.id} incident={incident} />
                  ))
              }
            </TableBody>
          </Table>

          {isEmpty && (
            <EmptyState
              icon={Activity}
              title="No incidents recorded"
              description="Incidents will appear here when CloudWatch alarms fire"
            />
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

      {/* Loading spinner while org is being resolved */}
      {!orgId && !isError && <LoadingSpinner className="py-24" />}
    </div>
  )
}
