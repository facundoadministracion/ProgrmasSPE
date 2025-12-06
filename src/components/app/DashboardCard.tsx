'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

type DashboardCardProps = {
  title: string;
  value: string | number;
  secondaryValue?: string;
  icon: React.ElementType;
  subtitle?: string; // Make subtitle optional
  onClick?: () => void;
  actionText?: string;
  color?: string;
  isLoading?: boolean;
};

export const DashboardCard = ({ title, value, secondaryValue, icon: Icon, subtitle, onClick, actionText, color = 'blue', isLoading = false }: DashboardCardProps) => {
  const colorClasses = {
    blue: { icon: 'text-blue-500' },
    red: { icon: 'text-red-500' },
    green: { icon: 'text-green-500' },
    indigo: { icon: 'text-indigo-500' },
    orange: { icon: 'text-orange-500' }
  };

  const selectedColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 text-muted-foreground ${selectedColor.icon}`} />}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-7 w-1/2 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {title === 'Total Padrón Liquidado' && secondaryValue ? (
                <>
                    <Separator className="my-2" />
                    <div className="text-xs text-muted-foreground">Total Monto Invertido</div>
                    <div className="text-l font-semibold text-gray-600">{secondaryValue}</div>
                </>
            ) : (
                <>
                    {secondaryValue && (
                        <div className="text-l font-semibold text-gray-600">{secondaryValue}</div>
                    )}
                </>
            )}
          </>
        )}
        {/* Only render subtitle if it exists */}
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
      {onClick && (
        <CardFooter className="pt-0">
          <Button onClick={onClick} variant="outline" className="w-full" disabled={isLoading}>{actionText || "Ver Detalles"}</Button>
        </CardFooter>
      )}
    </Card>
  );
};
