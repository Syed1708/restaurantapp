const { ZodError } = require('zod');

function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ message: 'Validation error', issues: err.format() });
      }
      next(err);
    }
  };
}

module.exports = validate;
