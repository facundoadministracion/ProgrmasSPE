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

export const calculateAgeAtEndOfMonth = (birthDateString: string | null | undefined): number => {
  if (!birthDateString) return 0;
  
  const birthDate = parseDate(birthDateString);
  if (!birthDate) return 0;

  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  let age = lastDayOfMonth.getFullYear() - birthDate.getFullYear();
  const m = lastDayOfMonth.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && lastDayOfMonth.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};


export const formatDateToDDMMYYYY = (dateString: string | undefined | null): string => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() + userTimezoneOffset);

        return localDate.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch(e) {
        return dateString; 
    }
}

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const formatMonthYear = (dateString: string | undefined | null): string => {
    if (!dateString) return 'Sin registros';
    try {
        const parts = dateString.split('/');
        if (parts.length !== 2) return dateString;

        const monthIndex = parseInt(parts[0], 10) - 1;
        const year = parts[1];

        if (monthIndex >= 0 && monthIndex < 12) {
            return `${meses[monthIndex]} ${year}`;
        }
        return dateString;
    } catch (e) {
        return dateString;
    }
};

export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || typeof value === 'undefined') {
    return '$ 0';
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const calculateSeniority = (dateString: string | null | undefined): string => {
  if (!dateString) return 'No especificada';

  // Asegurarse de que la fecha se interpreta correctamente como UTC
  const startDate = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
  if (isNaN(startDate.getTime())) return 'Fecha inválida';

  const today = new Date();
  if (startDate > today) return 'Ingreso futuro';

  let years = today.getFullYear() - startDate.getFullYear();
  let months = today.getMonth() - startDate.getMonth();
  
  if (today.getDate() < startDate.getDate()) {
    months--;
  }

  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (years === 0 && months === 0) return 'Menos de un mes';

  const yearText = years > 0 ? `${years} ${years === 1 ? 'año' : 'años'}` : '';
  const monthText = months > 0 ? `${months} ${months === 1 ? 'mes' : 'meses'}` : '';

  if (yearText && monthText) {
    return `${yearText} y ${monthText}`;
  }
  
  return yearText || monthText;
};