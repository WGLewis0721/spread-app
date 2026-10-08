/**
 * Run async jobs strictly one after another, in the order they were asked for, whether or not an
 * earlier one failed. Used so that "line the sync session up with the open profile" can never run
 * twice at once (two overlapping runs used to start two sessions for one profile).
 */
export function createSerial(): <T>(job: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(job: () => Promise<T>) => {
    const run = tail.then(job, job);
    tail = run.catch(() => undefined);
    return run;
  };
}
