export type OptimisticSnapshot<T> = T | undefined;

export async function runOptimistic<T, R>(opts: {
  apply: () => OptimisticSnapshot<T>;
  rollback: (snapshot: OptimisticSnapshot<T>) => void;
  commit: () => Promise<R>;
  reconcile?: (result: R) => void;
}): Promise<R> {
  const snapshot = opts.apply();
  try {
    const result = await opts.commit();
    opts.reconcile?.(result);
    return result;
  } catch (err) {
    opts.rollback(snapshot);
    throw err;
  }
}
