'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, Query, DocumentData, FirestoreError, collectionGroup } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';

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
  const { firestore: db } = useFirebase();
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | FirestorePermissionError | null>(null);

  // Memoizamos `transform` y `isCollectionGroup` para estabilizarlos
  const { transform, isCollectionGroup } = options;

  const memoizedTargetRefOrQuery = useMemo(() => {
    if (!db || !target) {
      return null;
    }
    if (typeof target === 'string') {
      const collectionFn = isCollectionGroup ? collectionGroup : collection;
      return query(collectionFn(db, target));
    }
    return target;
  }, [target, isCollectionGroup, db]);

  useEffect(() => {
    if (typeof window === 'undefined' || !db) {
      setIsLoading(false);
      return;
    }

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

        const finalData = transform
          ? transform(resolvedData)
          : (resolvedData as T[]);

        setData(finalData);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        const path =
          typeof memoizedTargetRefOrQuery === 'string'
            ? memoizedTargetRefOrQuery
            : (memoizedTargetRefOrQuery as any)._query.path.segments.join('/');

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });

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
          : (memoizedTargetRefOrQuery as any)._query.path.segments.join('/'),
      );
      unsubscribe();
    };
    // LA CORRECCIÓN CLAVE: Se elimina `options` del array de dependencias.
    // Solo se depende de las primitivas o funciones memoizadas.
  }, [memoizedTargetRefOrQuery, transform, db]);

  return { data, isLoading, error };
}
