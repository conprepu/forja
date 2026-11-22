import { Screen } from '../../ui/Screen'
import { BackupSection } from './BackupSection'
import { GoalsSection } from './GoalsSection'

export function ProfileScreen() {
  return (
    <Screen title="Perfil">
      <GoalsSection />
      <BackupSection />
    </Screen>
  )
}
