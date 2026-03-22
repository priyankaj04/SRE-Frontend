import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Building2, ChevronRight, Users } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { getMyOrgs, type OrgRole } from '@/api/orgs'

const ROLE_VARIANT: Record<OrgRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'outline',
  viewer: 'outline',
}

export default function OrgListPage() {
  const { data: orgs, isLoading, isError } = useQuery({
    queryKey: ['orgs'],
    queryFn: getMyOrgs,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisations"
        description="All workspaces you're a member of"
      />

      {isLoading && <LoadingSpinner />}

      {isError && (
        <div className="text-sm text-destructive">Failed to load organisations.</div>
      )}

      {orgs && orgs.length === 0 && (
        <EmptyState
          variant="card"
          icon={Building2}
          title="No organisations yet"
          description="Create one during registration or ask to be invited."
        />
      )}

      {orgs && orgs.length > 0 && (
        <div className="grid gap-3">
          {orgs.map((org) => (
            <Card key={org.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                      <Building2 size={18} className="text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{org.name}</CardTitle>
                      <CardDescription className="font-mono text-xs">{org.slug}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={ROLE_VARIANT[org.role]}>{org.role}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-0">
                <div className="flex gap-2">
                  {(org.role === 'admin' || org.role === 'owner' || org.role === 'member' || org.role === 'viewer') && (
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link to="/orgs/$orgId/members" params={{ orgId: org.id }} />}
                    >
                      <Users size={14} className="mr-1.5" />
                      {org.role === 'viewer' ? 'View members' : 'Members'}
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link to="/orgs/$orgId/members" params={{ orgId: org.id }} />}
                >
                  <ChevronRight size={16} />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
