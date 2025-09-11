
export interface PopulationJobConfig {
  id: string;
  label: string;
  production: {
    resource: string;
    amount: number;
    interval: number; // in milliseconds
  }[];
}

export const populationJobs: Record<string, PopulationJobConfig> = {
  gatherers: {
    id: 'gatherers',
    label: 'Gatherers',
    production: [
      {
        resource: 'wood',
        amount: 10,
        interval: 30000, // 30 seconds
      },
      {
        resource: 'stone',
        amount: 2,
        interval: 30000, // 30 seconds
      }
    ]
  },
  hunters: {
    id: 'hunters',
    label: 'Hunters',
    production: [
      {
        resource: 'meat',
        amount: 5,
        interval: 30000, // 30 seconds
      }
    ]
  }
};

export const getPopulationProduction = (jobId: string, count: number) => {
  const job = populationJobs[jobId];
  if (!job) return [];
  
  return job.production.map(prod => ({
    ...prod,
    totalAmount: prod.amount * count
  }));
};

export const getPopulationProductionText = (jobId: string): string => {
  const job = populationJobs[jobId];
  if (!job) return '';
  
  return job.production
    .map(prod => `${prod.amount} ${prod.resource}`)
    .join(', ') + ' per 30s';
};
import { GameState } from '@shared/schema';

export function getPopulationProductionText(state: GameState): string {
  const { villagers } = state;
  const productions: string[] = [];

  if (villagers.gatherers > 0) {
    const woodRate = villagers.gatherers * 1; // 1 wood per gatherer per tick
    productions.push(`+${woodRate} wood/s`);
  }

  if (villagers.hunters > 0) {
    const meatRate = villagers.hunters * 0.5; // 0.5 meat per hunter per tick
    productions.push(`+${meatRate} meat/s`);
  }

  return productions.length > 0 ? productions.join(', ') : '';
}
