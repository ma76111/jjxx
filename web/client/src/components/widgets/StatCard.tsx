interface Props {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
}

export default function StatCard({ label, value, icon, color = 'blue' }: Props) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50   text-blue-700   dark:bg-blue-900/30  dark:text-blue-300',
    green:  'bg-green-50  text-green-700  dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    red:    'bg-red-50    text-red-700    dark:bg-red-900/30   dark:text-red-300',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  };

  return (
    <div className={`card flex items-center gap-4 ${colors[color] ?? colors.blue}`}>
      {icon && <span className="text-3xl">{icon}</span>}
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm opacity-75">{label}</div>
      </div>
    </div>
  );
}
