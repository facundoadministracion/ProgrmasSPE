'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type DashboardCardProps = {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle: string;
  onClick?: () => void;
  actionText?: string;
  color?: string;
};

export const DashboardCard = ({ title, value, icon: Icon, subtitle, onClick, actionText, color = 'blue' }: DashboardCardProps) => {
  const colorClasses = {
    blue: {
      icon: 'text-blue-500',
    },
    red: {
      icon: 'text-red-500',
    },
    green: {
      icon: 'text-green-500',
    },
    indigo: {
        icon: 'text-indigo-500',
    }
  };

  const selectedColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 text-muted-foreground ${selectedColor.icon}`} />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
       {onClick && (
            <CardFooter>
                 <Button onClick={onClick} variant="outline" className="w-full">{actionText || "Ver Detalles"}</Button>
            </CardFooter>
       )}
    </Card>
  );
};
