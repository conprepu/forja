import { Screen } from '../../ui/Screen'
import { AppearanceSection } from './AppearanceSection'
import { BackupSection } from './BackupSection'
import { GoalsSection } from './GoalsSection'
import { WebSearchSection } from './WebSearchSection'

export function ProfileScreen() {
  return (
    <Screen title="Perfil">
      <GoalsSection />
      <AppearanceSection />
      <WebSearchSection />
      <BackupSection />
    </Screen>
  )
}
