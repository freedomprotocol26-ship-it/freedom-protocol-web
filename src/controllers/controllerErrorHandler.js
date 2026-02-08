module.exports = function controllerErrorHandler(handler) {
  if (typeof handler !== 'function') {
    throw new Error('controllerErrorHandler expects a function');
  }

  return async function (req, res, next) {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};
