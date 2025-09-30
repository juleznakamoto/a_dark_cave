
import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';

export default function BastionPanel() {
  const { executeAction, buildings, flags } = useGameStore();

  
}
