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

const parseDate = (dateString: string): Date | null => {
  const parts = dateString.split(/[-/]/);
  if (parts.length !== 3) return null;

  let day, month, year;

  if (parts[2].length === 4) { // DD/MM/YYYY or DD-MM-YYYY
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    year = parseInt(parts[2], 10);
  } else if (parts[0].length === 4) { // YYYY-MM-DD
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else {
    return null; // Formato no reconocido
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const date = new Date(year, month, day);
  // Verificación simple de validez
  if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
    return date;
  }
  return null;
}

export const calculateAge = (birthDateString: string | null | undefined): number => {
  if (!birthDateString) return 0;
  
  const birthDate = parseDate(birthDateString);
  if (!birthDate) return 0;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};


export const formatDateToDDMMYYYY = (dateString: string | undefined | null): string => {
    if (!dateString) return '-';
    // El input de tipo "date" devuelve YYYY-MM-DD.
    // Firestore puede devolver un string ISO o un objeto Timestamp.
    // Esta función intenta manejar ambos casos.
    try {
        const date = new Date(dateString);
        // Si el string de entrada no tiene info de timezone, se tratará como UTC.
        // Sumamos el offset para mostrar la fecha local correcta.
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() + userTimezoneOffset);

        return localDate.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch(e) {
        return dateString; // Si falla, devuelve el string original
    }
}
