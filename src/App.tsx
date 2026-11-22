import { TabBar } from './components/TabBar'
import { useRoute } from './lib/router'
import { TodayScreen } from './screens/TodayScreen'
import { ListsScreen } from './screens/ListsScreen'
import { HabitsScreen } from './screens/HabitsScreen'
import { SettingsScreen } from './screens/SettingsScreen'

export function App() {
  const { segments } = useRoute()
  const tab = segments[0] ?? 'today'

  let screen
  switch (tab) {
    case 'lists': screen = <ListsScreen />; break
    case 'habits': screen = <HabitsScreen />; break
    case 'settings': screen = <SettingsScreen />; break
    default: screen = <TodayScreen />
  }

  return (
    <>
      {screen}
      <TabBar active={tab} />
    </>
  )
}
