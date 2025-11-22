import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const parseCSV = (text: string): { dni: string, monto: number }[] => {
  const lines = text.split('\n');
  const result = [];
  // Skip header row by starting at 1, or handle headers dynamically
  for(let i = 0; i < lines.length; i++){ 
    if(lines[i].trim() === '') continue;
    const currentline = lines[i].split(',');
    if(currentline.length >= 2) {
      const dni = currentline[0].trim().replace(/\./g, ''); 
      const monto = parseFloat(currentline[1].trim());
      if(!isNaN(parseInt(dni)) && dni.length > 6 && !isNaN(monto)) {
         result.push({ dni, monto });
      }
    }
  }
  return result;
};

export const calculateAge = (birthDateString: string | null | undefined): number => {
  if (!birthDateString) return 0;
  // Handles both 'YYYY-MM-DD' and 'DD/MM/YYYY'
  const parts = birthDateString.split(/[-/]/);
  let birthDate: Date;
  if (parts.length === 3) {
    const year = parseInt(parts[2], 10) > 1000 ? parseInt(parts[2], 10) : parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = year === parseInt(parts[2], 10) ? parseInt(parts[0], 10) : parseInt(parts[2], 10);
    birthDate = new Date(year, month, day);
  } else {
    return 0; // Invalid date format
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};
