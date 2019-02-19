/**
 * HOF for creating abortable promise chains
 * @param {{abort: () => void}} abortToken - token used to abort promise chain with token.abort()
 * @return {(promise: Promise) => Promise} - function that returns abortable promise
 */
const withAbortToken = abortToken => promise =>
  new Promise((resolve, reject) => {
    abortToken.abort = () => {
      resolve = null;
      reject = null;
    };
    promise
      .then(value => {
        if (resolve) resolve(value);
      })
      .catch(reason => {
        if (reject) reject(reason);
      });
  });

export default withAbortToken;
