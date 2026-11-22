import { Outlet } from 'react-router'
import { LiveStrip } from './LiveStrip'
import { TabBar } from './TabBar'
import { UpdatePrompt } from '../ui/UpdatePrompt'

export function Layout() {
  return (
    <>
      <main className="mx-auto max-w-[640px] pr-[max(16px,env(safe-area-inset-right))] pl-[max(16px,env(safe-area-inset-left))]">
        <Outlet />
      </main>
      <UpdatePrompt />
      <LiveStrip />
      <TabBar />
    </>
  )
}
