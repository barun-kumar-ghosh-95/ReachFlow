// src/app/(app)/layout.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/app/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Get user's first workspace
  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      status: 'ACTIVE',
    },
    include: {
      workspace: {
        select: { id: true, name: true, plan: true, status: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const workspace = membership?.workspace ?? null

  return (
    <div className="app-layout">
      <Sidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
        workspace={workspace}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
