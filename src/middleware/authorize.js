function authorizeOrPermission(allowedRoles = [], requiredPermissions = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    // if role found then go next
    if (allowedRoles.includes(req.user.role)) return next();

    // then check permissions against this role
    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));
    if (hasPermission) return next();

    return res.status(403).json({ message: 'Forbidden' });
  };
}
