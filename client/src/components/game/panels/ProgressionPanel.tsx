
import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction } from '@/game/rules';
import { GameState } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface UnlockCondition {
  path: string;
  value: any;
  current: any;
  met: boolean;
}

interface ActionInfo {
  id: string;
  label: string;
  category: string;
  unlocked: boolean;
  canExecute: boolean;
  conditions: UnlockCondition[];
  cost?: Record<string, number>;
}

function getValueAtPath(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function parseConditions(requirements: any, state: GameState, actionId: string): UnlockCondition[] {
  const conditions: UnlockCondition[] = [];
  
  if (!requirements) return conditions;

  // Handle building actions with levels
  const action = gameActions[actionId];
  let reqs = requirements;
  
  if (action.building && typeof requirements === 'object' && !Array.isArray(requirements)) {
    // For building actions, check the next level requirements
    const currentLevel = getValueAtPath(state, `buildings.${actionId.replace('build', '').toLowerCase()}`) || 0;
    const nextLevel = currentLevel + 1;
    reqs = requirements[nextLevel] || requirements[1] || requirements;
  }

  Object.entries(reqs).forEach(([path, expectedValue]) => {
    const currentValue = getValueAtPath(state, path);
    const met = typeof expectedValue === 'boolean' 
      ? currentValue === expectedValue 
      : currentValue >= expectedValue;

    conditions.push({
      path,
      value: expectedValue,
      current: currentValue,
      met
    });
  });

  return conditions;
}

function getCostConditions(cost: any, state: GameState, actionId: string): UnlockCondition[] {
  const conditions: UnlockCondition[] = [];
  
  if (!cost) return conditions;

  const action = gameActions[actionId];
  let costs = cost;

  // Handle building actions with levels
  if (action.building && typeof cost === 'object' && !Array.isArray(cost)) {
    const currentLevel = getValueAtPath(state, `buildings.${actionId.replace('build', '').toLowerCase()}`) || 0;
    const nextLevel = currentLevel + 1;
    costs = cost[nextLevel] || cost[1] || cost;
  }

  Object.entries(costs).forEach(([path, requiredAmount]) => {
    if (typeof requiredAmount === 'number') {
      const currentValue = getValueAtPath(state, path) || 0;
      conditions.push({
        path,
        value: requiredAmount,
        current: currentValue,
        met: currentValue >= requiredAmount
      });
    }
  });

  return conditions;
}

function categorizeAction(actionId: string): string {
  if (actionId.startsWith('build')) return 'Buildings';
  if (actionId.startsWith('craft')) return 'Crafting';
  if (actionId.includes('explore') || actionId.includes('mine')) return 'Cave';
  return 'Basic';
}

function formatConditionText(condition: UnlockCondition): string {
  const pathParts = condition.path.split('.');
  const category = pathParts[0];
  const name = pathParts.slice(1).join(' ');
  
  const displayName = name.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  if (typeof condition.value === 'boolean') {
    return condition.value ? `Have ${displayName}` : `Don't have ${displayName}`;
  }

  return `${displayName}: ${condition.current || 0}/${condition.value}`;
}

export default function ProgressionPanel() {
  const state = useGameStore();

  // Get all actions and their unlock status
  const actionInfos: ActionInfo[] = Object.entries(gameActions).map(([actionId, action]) => {
    const unlocked = shouldShowAction(actionId, state);
    const canExecute = canExecuteAction(actionId, state);
    const unlockConditions = parseConditions(action.show_when, state, actionId);
    const costConditions = getCostConditions(action.cost, state, actionId);

    return {
      id: actionId,
      label: action.label,
      category: categorizeAction(actionId),
      unlocked,
      canExecute,
      conditions: [...unlockConditions, ...costConditions],
      cost: action.cost
    };
  });

  // Group by category
  const categories = actionInfos.reduce((acc, action) => {
    if (!acc[action.category]) acc[action.category] = [];
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, ActionInfo[]>);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium border-b border-border pb-2">Progression Tree</h2>
      
      {Object.entries(categories).map(([category, actions]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {actions.map((action) => (
              <div key={action.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{action.label}</span>
                  <div className="flex gap-2">
                    {action.unlocked ? (
                      <Badge variant="default" className="bg-green-600">Unlocked</Badge>
                    ) : (
                      <Badge variant="secondary">Locked</Badge>
                    )}
                    {action.unlocked && action.canExecute && (
                      <Badge variant="default" className="bg-blue-600">Ready</Badge>
                    )}
                  </div>
                </div>
                
                {action.conditions.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Requirements:</div>
                    {action.conditions.map((condition, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <span className={condition.met ? "text-green-600" : "text-red-600"}>
                          {condition.met ? "✓" : "✗"}
                        </span>
                        <span>{formatConditionText(condition)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
