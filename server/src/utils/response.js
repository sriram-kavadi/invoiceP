/**
 * Sends a successful JSON response.
 * @param {import('express').Response} res
 * @param {any} data
 * @param {string} [message]
 * @param {number} [statusCode]
 */
export const success = (res, data = null, message = 'Success', statusCode = 200) => {
  const payload = { success: true, message };
  if (data !== null && data !== undefined) {
    payload.data = data;
  }
  return res.status(statusCode).json(payload);
};

/**
 * Sends an error JSON response.
 * @param {import('express').Response} res
 * @param {string} [message]
 * @param {number} [statusCode]
 * @param {any} [errors]
 */
export const error = (res, message = 'An error occurred.', statusCode = 400, errors = null) => {
  const payload = { success: false, message };
  if (errors !== null && errors !== undefined) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
};
