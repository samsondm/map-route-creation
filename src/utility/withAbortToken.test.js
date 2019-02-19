import withAbortToken from './withAbortToken';

describe('withAbortToken', () => {
  it('resolves resolved promise', async () => {
    const value = 'resoled value';
    const promise = Promise.resolve(value);
    const abortPromise = withAbortToken({})(promise);
    await expect(abortPromise).resolves.toBe(value);
  });

  it('rejects rejected promise', async () => {
    const reason = 'rejected reason';
    const promise = Promise.reject(reason);
    const abortPromise = withAbortToken({})(promise);
    await expect(abortPromise).rejects.toBe(reason);
  });

  it('aborts promise chain on token.abort()', async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const token = { abort: null };
    const withToken = withAbortToken(token);
    const promise = wait(1000);
    const abortPromise = withToken(promise);
    const mock = jest.fn();
    abortPromise.then(mock).catch(mock);
    token.abort();
    await wait(2000);
    expect(mock).not.toHaveBeenCalled();
  });
});
