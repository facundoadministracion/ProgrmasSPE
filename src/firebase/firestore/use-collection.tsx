
'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, Query, DocumentData, FirestoreError, collectionGroup } from 'firebase/firestore';
import { db } from '@/firebase/config';

// Define un tipo para el error personalizado
class FirestorePermissionError extends Error {
  public code: string;
  public firestoreOperation: string;
  public firestorePath: string;

  constructor(options: {
    operation: string;
    path: string;
    cause?: unknown;
  }) {
    super(`Missing or insufficient permissions: The following request was denied by Firestore Security Rules: ${options.path}`);
    this.name = 'FirestorePermissionError';
    this.code = 'permission-denied';
    this.firestoreOperation = options.operation;
    this.firestorePath = options.path;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

// --- Tipos y funciones de ayuda ---

type Target = Query<DocumentData, DocumentData>;

interface UseCollectionOptions<T> {
  transform?: (data: DocumentData[]) => T[];
  isCollectionGroup?: boolean;
}

export function useCollection<T>(target: string | Target | null, options: UseCollectionOptions<T> = {}) {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | FirestorePermissionError | null>(null);

  const memoizedTargetRefOrQuery = useMemo(() => {
    if (!target) {
      return null;
    }
    if (typeof target === 'string') {
      const collectionFn = options.isCollectionGroup ? collectionGroup : collection;
      return query(collectionFn(db, target));
    }
    return target;
  }, [target, options.isCollectionGroup]);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData([]);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (querySnapshot) => {
        const resolvedData: DocumentData[] = [];
        querySnapshot.forEach((doc) => {
          resolvedData.push({ ...doc.data(), id: doc.id });
        });

        const finalData = options.transform
          ? options.transform(resolvedData)
          : (resolvedData as T[]);

        setData(finalData);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        // En lugar de devolver el error críptico, devolvemos uno más amigable
        // que incluye el path y el tipo de operación que falló.
        const path =
          typeof memoizedTargetRefOrQuery === 'string'
            ? memoizedTargetRefOrQuery
            // Corregido: Usar la propiedad correcta para obtener el path de la colección
            : (memoizedTargetRefOrQuery as any)._query.path.segments.join('/');

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        })

        console.error(contextualError);
        setError(contextualError);
        setIsLoading(false);
      }
    );

    return () => {
      console.log(
        'Cleaning up collection listener for ',
        typeof memoizedTargetRefOrQuery === 'string'
          ? memoizedTargetRefOrQuery
          // Corregido: Usar la propiedad correcta para obtener el path de la colección
          : (memoizedTargetRefOrQuery as any)._query.path.segments.join('/'),
      )
      unsubscribe()
    }
  }, [memoizedTargetRefOrQuery, options.transform]);

  return { data, isLoading, error };
}
