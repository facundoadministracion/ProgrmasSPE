'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

type DashboardCardProps = {
  title: string;
  value: string | number;
  secondaryValue?: string;
  icon?: React.ElementType;
  logoSrc?: string;
  subtitle?: string;
  onClick?: () => void;
  actionText?: string;
  color?: string;
  isLoading?: boolean;
};

export const DashboardCard = ({ 
    title, 
    value, 
    secondaryValue, 
    icon: Icon, 
    logoSrc,
    subtitle, 
    onClick, 
    actionText, 
    color = 'gray', 
    isLoading = false 
}: DashboardCardProps) => {
  const colorStyles: { [key: string]: { border: string; icon: string } } = {
    red:    { border: 'border-brand-red',    icon: 'text-brand-red' },
    green:  { border: 'border-brand-green',  icon: 'text-brand-green' },
    yellow: { border: 'border-brand-yellow', icon: 'text-brand-yellow' },
    gray:   { border: 'border-brand-gray',   icon: 'text-brand-gray' },
    // --- Legacy color mappings for backwards compatibility ---
    blue:   { border: 'border-brand-gray',   icon: 'text-brand-gray' },
    orange: { border: 'border-brand-yellow', icon: 'text-brand-yellow' },
    indigo: { border: 'border-brand-gray',   icon: 'text-brand-gray' },
  };

  const selectedStyle = colorStyles[color] || colorStyles.gray;

  return (
    <Card className={`overflow-hidden ${selectedStyle.border} border-l-4 flex flex-col`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {logoSrc ? (
            <div className="relative h-10 w-20">
                <Image src={logoSrc} alt={`${title} logo`} layout="fill" objectFit="contain" />
            </div>
        ) : (
          Icon && <Icon className={`h-4 w-4 ${selectedStyle.icon}`} />
        )}
      </CardHeader>
      <CardContent className="flex-grow">
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
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
      {onClick && (
        <CardFooter className="pt-0 mt-auto">
          <Button onClick={onClick} variant="outline" className="w-full" disabled={isLoading}>{actionText || "Ver Detalles"}</Button>
        </CardFooter>
      )}
    </Card>
  );
};
