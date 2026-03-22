import { apiClient } from './client'

export type OrgRole = 'viewer' | 'member' | 'admin' | 'owner'

export interface Org {
  id: string
  name: string
  slug: string
  role: OrgRole
}

export interface OrgMember {
  userId: string
  full_name: string
  email: string
  role: OrgRole
}

export interface Pagination {
  page: number
  limit: number
  total: number
}

export interface MembersResponse {
  data: OrgMember[]
  meta: Pagination
}

export async function getMyOrgs(): Promise<Org[]> {
  const { data } = await apiClient.get<{ data: Org[] }>('/orgs/me')
  return data.data
}

export async function listMembers(
  orgId: string,
  page = 1,
  limit = 20,
): Promise<MembersResponse> {
  const { data } = await apiClient.get<MembersResponse>(
    `/orgs/${orgId}/members`,
    { params: { page, limit } },
  )
  return data
}

export async function changeMemberRole(
  orgId: string,
  userId: string,
  role: OrgRole,
): Promise<{ userId: string; role: OrgRole }> {
  const { data } = await apiClient.patch(
    `/orgs/${orgId}/members/${userId}/role`,
    { role },
  )
  return data
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  await apiClient.delete(`/orgs/${orgId}/members/${userId}`)
}
