import { clsx } from 'clsx';

export default function StatusBadge({ active }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600',
      )}
    >
      <span
        className={clsx(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          active ? 'bg-green-500' : 'bg-red-500',
        )}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
