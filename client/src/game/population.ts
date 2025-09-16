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
  gatherer: {
    id: 'gatherer',
    label: 'gatherer',
    production: [
      {
        resource: 'wood',
        amount: 10,
        interval: 15000,
      },
      {
        resource: 'stone',
        amount: 2,
        interval: 15000,
      }
    ]
  },
  hunter: {
    id: 'hunter',
    label: 'hunter',
    production: [
      {
        resource: 'food',
        amount: 5,
        interval: 15000,
      },
      {
        resource: 'bones',
        amount: 1,
        interval: 15000,
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
    .join(', ') + ' per 15s';
};