import { cn } from '@/lib/utils';

export function Badge({
  children,
  color,
  className,
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-[8px] text-[10px] font-bold tracking-wide transition-colors duration-200',
        className,
      )}
      style={
        color
          ? { backgroundColor: `${color}18`, color, border: `1px solid ${color}40` }
          : {
              backgroundColor: 'rgba(6, 182, 212, 0.12)',
              color: '#22D3EE',
              border: '1px solid rgba(6, 182, 212, 0.35)',
            }
      }
    >
      {children}
    </span>
  );
}
