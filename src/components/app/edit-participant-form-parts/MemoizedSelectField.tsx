'use client';
import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  id: string;
  label: string;
  value: string;
  onUpdate: (id: string, value: string) => void;
  options: readonly string[] | { value: string; label: string }[];
  placeholder?: string;
}

const FieldWrapper = ({ children, label, id }: { children: React.ReactNode, label: string, id: string }) => (
    <div className="flex-grow basis-1/3 p-2">
        <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
        <div className="mt-1">{children}</div>
    </div>
);

const MemoizedSelectField: React.FC<Props> = React.memo(({ id, label, value, onUpdate, options, placeholder }) => {
  const handleValueChange = (newValue: string) => {
    onUpdate(id, newValue);
  };

  return (
    <FieldWrapper label={label} id={id}>
        <Select value={value} onValueChange={handleValueChange}>
            <SelectTrigger><SelectValue placeholder={placeholder || 'Seleccione...'} /></SelectTrigger>
            <SelectContent>
                {options.map(option => {
                    const itemValue = typeof option === 'string' ? option : option.value;
                    const itemLabel = typeof option === 'string' ? option : option.label;
                    return <SelectItem key={itemValue} value={itemValue}>{itemLabel}</SelectItem>
                })}
            </SelectContent>
        </Select>
    </FieldWrapper>
  );
});

MemoizedSelectField.displayName = 'MemoizedSelectField';

export default MemoizedSelectField;
