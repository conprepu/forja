import { Screen } from '../../ui/Screen'
import { BackupSection } from './BackupSection'
import { GoalsSection } from './GoalsSection'
import { WebSearchSection } from './WebSearchSection'

export function ProfileScreen() {
  return (
    <Screen title="Perfil">
      <GoalsSection />
      <WebSearchSection />
      <BackupSection />
    </Screen>
  )
}
