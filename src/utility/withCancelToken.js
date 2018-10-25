const withCancelToken = (token) => async (promise) => {
  try {
    const result = await promise;
    if (!token.value) {
      throw Object({ type: 'CANCELED' });
    }
    return result;
  } catch (err) {
    throw token.value ? err : { type: 'CANCELED' };
  }
};

export default withCancelToken;