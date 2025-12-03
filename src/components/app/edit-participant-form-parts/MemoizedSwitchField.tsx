'use client';
import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Props {
  id: string;
  label: string;
  checked: boolean;
  onUpdate: (id: string, checked: boolean) => void;
}

const MemoizedSwitchField: React.FC<Props> = React.memo(({ id, label, checked, onUpdate }) => {
  const handleCheckedChange = (newChecked: boolean) => {
    onUpdate(id, newChecked);
  };

  return (
    <div className="w-full p-2 mt-2">
        <div className="flex items-center gap-2 bg-indigo-50 p-3 rounded border border-indigo-100">
            <Switch id={id} checked={checked} onCheckedChange={handleCheckedChange} />
            <Label htmlFor={id} className="font-bold text-indigo-800 select-none cursor-pointer">
                {label}
            </Label>
        </div>
    </div>
  );
});

MemoizedSwitchField.displayName = 'MemoizedSwitchField';

export default MemoizedSwitchField;
