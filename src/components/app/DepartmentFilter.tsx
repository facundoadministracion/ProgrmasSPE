'use client';

import React, { useMemo } from 'react';
import { DEPARTAMENTOS } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DepartmentFilterProps {
  selectedDepartment: string;
  onSelectDepartment: (department: string) => void;
}

const DepartmentFilter: React.FC<DepartmentFilterProps> = ({ selectedDepartment, onSelectDepartment }) => {
  const departmentOptions = useMemo(() => {
    // Ordena la lista de departamentos alfabéticamente para asegurar consistencia
    const sortedDepartments = [...DEPARTAMENTOS].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    // Se devuelve la lista de departamentos ordenada con la opción "Todos" al principio
    return ['Todos', ...sortedDepartments];
  }, []);

  return (
    <Select value={selectedDepartment} onValueChange={onSelectDepartment}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Filtrar por Departamento" />
      </SelectTrigger>
      <SelectContent>
        {departmentOptions.map(dept => (
          <SelectItem key={dept} value={dept}>
            {dept}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default DepartmentFilter;
