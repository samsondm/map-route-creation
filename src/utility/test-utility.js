export const randomString = (length = 5) =>
  Math.round(Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))
    .toString(36)
    .slice(1);
export const randomNumber = ({ min = 0, max = 1000 } = {}) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
