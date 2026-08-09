import { requireApprovedUser } from '@/lib/auth/current-user'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireApprovedUser()

  return children
}
