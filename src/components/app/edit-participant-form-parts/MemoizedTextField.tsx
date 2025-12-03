'use client';
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  id: string;
  label: string;
  value: string;
  onUpdate: (id: string, value: string) => void;
  type?: string;
  disabled?: boolean;
}

const FieldWrapper = ({ children, label, id }: { children: React.ReactNode, label: string, id: string }) => (
    <div className="flex-grow basis-1/3 p-2">
        <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
        <div className="mt-1">{children}</div>
    </div>
);

const MemoizedTextField: React.FC<Props> = React.memo(({ id, label, value, onUpdate, type = 'text', disabled = false }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(id, e.target.value);
  };

  return (
    <FieldWrapper label={label} id={id}>
      <Input id={id} type={type} value={value} onChange={handleChange} disabled={disabled} />
    </FieldWrapper>
  );
});

MemoizedTextField.displayName = 'MemoizedTextField';

export default MemoizedTextField;
