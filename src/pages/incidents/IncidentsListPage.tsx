import { type ElementType } from 'react'
import { useSearch, useNavigate, Link } from '@tanstack/react-router'
import {
  Server, Database, HardDrive, Zap, Globe, Box,
  Activity, ChevronLeft, ChevronRight, AlertCircle,
  Sparkles, Terminal, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { EmptyState } from '@/components/EmptyState'
import { useOrgIncidents } from '@/api/useThresholds'
import type { OrgIncident } from '@/api/thresholds'
import { useCurrentOrgId } from '@/utils/useCurrentOrgId'

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 20
const FROM_PATH = '/app/incidents' as const
const NAV_PATH  = '/incidents'      as const

const SERVICE_ICONS: Record<string, ElementType> = {
  ec2: Server, rds: Database, s3: HardDrive, lambda: Zap, elb: Globe,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────


function getServiceIcon(service: string): ElementType {
  return SERVICE_ICONS[service?.toLowerCase()] ?? Box
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8).toUpperCase() : id.toUpperCase()
}

function assigneeInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

const priorityConfig: Record<string, { label: string; cls: string; dot: string }> = {
  high:   { label: 'High',   cls: 'bg-red-500/15 text-red-400 border border-red-500/20',       dot: 'bg-red-400' },
  medium: { label: 'Medium', cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/20', dot: 'bg-amber-400' },
  low:    { label: 'Low',    cls: 'bg-muted text-muted-foreground/60 border border-border',     dot: 'bg-muted-foreground/40' },
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  open:     { label: 'Active',   cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  resolved: { label: 'Resolved', cls: 'bg-muted text-muted-foreground/60 border border-border' },
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[72px_1fr_96px_96px_96px] gap-4 px-5 py-3.5 border-b border-border/40">
      <div className="h-3 w-16 bg-muted animate-pulse rounded" />
      <div className="h-3 w-40 bg-muted animate-pulse rounded" />
      <div className="h-3 w-16 bg-muted animate-pulse rounded" />
      <div className="h-3 w-16 bg-muted animate-pulse rounded" />
      <div className="h-3 w-16 bg-muted animate-pulse rounded" />
    </div>
  )
}

// ─── Incident row ─────────────────────────────────────────────────────────────

function IncidentRow({ incident }: { incident: OrgIncident }) {
  const navigate = useNavigate()
  const ServiceIcon = getServiceIcon(incident.resource_service)
  const priority = priorityConfig[incident.priority] ?? priorityConfig.low
  const status = statusConfig[incident.status] ?? statusConfig.open

  return (
    <div
      className="grid grid-cols-[72px_1fr_96px_96px_96px] gap-4 px-5 py-3.5 border-b border-border/40 hover:bg-muted/30 transition-colors duration-150 cursor-pointer group"
      onClick={() => navigate({ to: '/incidents/$incidentId', params: { incidentId: incident.id } })}
    >
      <span className="text-[11px] font-mono text-primary/80 self-center truncate">
        {shortId(incident.id)}
      </span>

      <div className="min-w-0 self-center space-y-0.5">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors duration-150">
          {incident.metric_name}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
          <ServiceIcon size={11} className="shrink-0" />
          <span className="truncate">{incident.resource_name || incident.resource_id}</span>
          {incident.resource_region && (
            <>
              <span className="opacity-30">·</span>
              <span>{incident.resource_region}</span>
            </>
          )}
        </div>
      </div>

      <div className="self-center">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded uppercase tracking-wide ${priority.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${priority.dot}`} />
          {priority.label}
        </span>
      </div>

      <div className="self-center">
        <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded uppercase tracking-wide ${status.cls}`}>
          {status.label}
        </span>
      </div>

      <div className="self-center">
        {incident.assigned_to ? (
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-semibold text-primary">{assigneeInitials(incident.assigned_to)}</span>
            </div>
            <span className="text-xs text-foreground/60 truncate max-w-14">{incident.assigned_to}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/40">Unassigned</span>
        )}
      </div>
    </div>
  )
}

// ─── Remediation Engine ───────────────────────────────────────────────────────

function RemediationEngine() {
  return (
    <div className="flex flex-col h-full border-l border-border/40 bg-card/50">
      <div className="px-5 py-4 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <h3 className="text-sm font-semibold text-foreground">Remediation Engine</h3>
        </div>
        <p className="text-[11px] text-muted-foreground/60">Automated intelligence for INC-8812</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Root cause */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium">Root Cause Confidence</span>
            <span className="text-sm font-semibold text-foreground">94%</span>
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full w-[94%] bg-primary rounded-full" />
          </div>
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed pt-0.5">
            Pattern match detected: Consistent with "Connection Storm" behavior observed in Cluster A last week.
          </p>
        </div>

        {/* Recommended actions */}
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-medium">Recommended Actions</p>
          {[
            { icon: <Sparkles size={12} className="text-primary" />, title: 'Scale API Ingress', desc: 'Increase replica count by 50% to absorb traffic surge.' },
            { icon: <Activity size={12} className="text-emerald-400" />, title: 'Enable Circuit Breaker', desc: 'Trip the SXX fuse for downstream microservice v4.' },
          ].map((action) => (
            <div key={action.title} className="bg-card rounded-lg p-3 space-y-2 border border-border/40">
              <div className="flex items-center gap-2">
                {action.icon}
                <span className="text-xs font-medium text-foreground">{action.title}</span>
              </div>
              <p className="text-[11px] text-muted-foreground/60 leading-relaxed">{action.desc}</p>
              <button className="w-full py-1.5 text-[10px] font-semibold tracking-widest uppercase text-primary border border-primary/25 rounded hover:bg-primary/10 transition-colors duration-200 flex items-center justify-center gap-1.5">
                <Terminal size={10} /> Execute Command
              </button>
            </div>
          ))}
        </div>

        {/* Similar past incidents */}
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-medium">Similar Past Incidents</p>
          {[
            { id: 'INC-4401', title: 'Internal Load Balancer Saturation', resolved: '6d ago' },
            { id: 'INC-3882', title: 'Nginx Worker Process Crash',         resolved: '11d ago' },
          ].map((past) => (
            <div key={past.id} className="bg-card rounded-lg px-3 py-2.5 space-y-0.5 border border-border/40">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-primary/70">{past.id}</span>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                  <Clock size={9} /> Resolved {past.resolved}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground/60">{past.title}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-border/40 shrink-0">
        <button className="w-full py-2.5 text-[11px] font-semibold tracking-widest uppercase text-foreground bg-muted/60 border border-border/60 rounded hover:bg-muted transition-colors duration-200">
          Open Full Diagnostics
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IncidentsListPage() {
  const { offset } = useSearch({ from: FROM_PATH })
  const navigate = useNavigate()
  const orgId = useCurrentOrgId()

  const { data, isLoading, isError, refetch } = useOrgIncidents(orgId, { limit: LIMIT, offset })

  function setPage(newOffset: number) {
    navigate({ to: NAV_PATH, search: { offset: newOffset }, replace: true })
  }

  const incidents = data?.data ?? []
  const pagination = data?.pagination
  const total = pagination?.total ?? 0
  const hasMore = pagination?.hasMore ?? false
  const currentStart = total === 0 ? 0 : offset + 1
  const currentEnd = Math.min(offset + LIMIT, total)
  const isEmpty = !!orgId && !isLoading && !isError && incidents.length === 0
  const canGoPrev = offset > 0
  const canGoNext = hasMore || offset + LIMIT < total

  return (
    <div className="flex-1 flex flex-col -m-6 lg:-m-8">

      {/* Breadcrumb bar */}
      <div className="flex items-center justify-between px-6 lg:px-8 py-4 border-b border-border/40 shrink-0">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                render={<Link to="/dashboard" />}
                className="text-muted-foreground/50 hover:text-foreground text-xs uppercase tracking-widest font-medium transition-colors"
              >
                Sentinel
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-muted-foreground/30" />
            <BreadcrumbItem>
              <BreadcrumbLink
                render={<Link to="/incidents" search={{ offset: 0 }} />}
                className="text-muted-foreground/50 hover:text-foreground text-xs uppercase tracking-widest font-medium transition-colors"
              >
                Incidents
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-muted-foreground/30" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-foreground/80 text-xs uppercase tracking-widest font-medium">
                Active
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {total > 0 && (
          <span className="text-[11px] text-muted-foreground/40 font-medium">{total} incidents</span>
        )}
      </div>

      {/* Body: table + right panel */}
      <div className="flex flex-1 min-h-0">

        {/* Left: table */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Column headers */}
          <div className="grid grid-cols-[72px_1fr_96px_96px_96px] gap-4 px-5 py-2.5 border-b border-border/40 bg-muted/20 shrink-0">
            {['ID', 'Title', 'Severity', 'Status', 'Assigned'].map((h) => (
              <span key={h} className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-medium">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto">
            {isError && (
              <div className="m-5 flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertCircle size={14} className="shrink-0" />
                <span>Failed to load incidents.</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => refetch()}
                >
                  Retry
                </Button>
              </div>
            )}

            {!isError && (isLoading || !orgId)
              ? Array.from({ length: 10 }, (_, i) => <SkeletonRow key={i} />)
              : incidents.map((incident) => <IncidentRow key={incident.id} incident={incident} />)
            }

            {isEmpty && (
              <EmptyState
                icon={Activity}
                title="No incidents recorded"
                description="Incidents will appear here when CloudWatch alarms fire"
              />
            )}
          </div>

          {/* Pagination */}
          {!isLoading && !isError && total > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 bg-muted/20 shrink-0">
              <span className="text-[11px] text-muted-foreground/50">
                {currentStart}–{currentEnd} of {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  disabled={!canGoPrev}
                  onClick={() => setPage(Math.max(0, offset - LIMIT))}
                >
                  <ChevronLeft size={12} /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  disabled={!canGoNext}
                  onClick={() => setPage(offset + LIMIT)}
                >
                  Next <ChevronRight size={12} />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Remediation Engine */}
        <div className="w-72 shrink-0">
          <RemediationEngine />
        </div>

      </div>
    </div>
  )
}
