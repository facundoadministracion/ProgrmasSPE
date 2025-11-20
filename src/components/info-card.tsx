import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type InfoCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  actionText?: string;
  actionHref?: string;
  color?: 'blue' | 'red' | 'green' | 'indigo';
};

const colorClasses = {
  blue: 'border-blue-500 text-blue-600 bg-blue-100',
  red: 'border-red-500 text-red-600 bg-red-100',
  green: 'border-green-500 text-green-600 bg-green-100',
  indigo: 'border-indigo-500 text-indigo-600 bg-indigo-100',
};

const buttonColorClasses = {
  blue: 'border-blue-200 text-blue-700 hover:bg-blue-50',
  red: 'border-red-200 text-red-700 hover:bg-red-50',
  green: 'border-green-200 text-green-700 hover:bg-green-50',
  indigo: 'border-indigo-200 text-indigo-700 hover:bg-indigo-50',
}

export function InfoCard({
  title,
  value,
  icon: Icon,
  subtitle,
  actionText,
  actionHref,
  color = 'blue',
}: InfoCardProps) {
  const colorClass = colorClasses[color];
  const buttonColorClass = buttonColorClasses[color];

  return (
    <Card className={cn('flex flex-col justify-between h-full border-l-4 shadow-sm', colorClass)}>
      <CardHeader className="flex-row items-center pb-2">
        <div className={cn('p-3 rounded-full mr-4', colorClass)}>
          <Icon className="size-6" />
        </div>
        <div>
          <CardDescription className="uppercase font-medium">{title}</CardDescription>
          <CardTitle className="text-2xl">{value}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow" />
      <CardFooter className="flex-col items-start gap-2 pt-0">
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {actionHref && (
          <Button asChild variant="outline" className={cn('w-full', buttonColorClass)}>
            <Link href={actionHref}>{actionText || 'Ver Detalles'}</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
