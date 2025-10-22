function authorizeOrPermission(allowedRoles = [], requiredPermissions = []) {
  return (req, res, next) => {
    // 1️⃣ Ensure user is authenticated
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    // 2️⃣ Check if user's role is allowed
    if (allowedRoles.includes(req.user.role)) return next();

    // 3️⃣ Check if user has at least one of the required permissions
    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));
    if (hasPermission) return next();

    // 4️⃣ Deny if neither role nor permissions match
    return res.status(403).json({ message: 'Forbidden' });
  };
}

module.exports = authorizeOrPermission;
