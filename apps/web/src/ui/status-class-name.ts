export const statusClassName = (status: string): string => {
  if (status === 'Completed' || status === 'Success' || status === 'Active') return 'status-chip status-positive';
  if (status === 'Blocked' || status === 'Failed') return 'status-chip status-negative';
  if (status === 'In Progress' || status === 'Running' || status === 'Online') return 'status-chip status-running';
  return 'status-chip status-pending';
};
