export type ProjectStatus = 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export type Project = {
  id: string;
  clientId: string;
  clientName?: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  budget?: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

