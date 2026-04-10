/** @author Jaymar Xedd */

/**
 * @param {Object} config
 * @param {number} role
 * @param {string|null} permissionGroup
 * @param {string} senderID
 * @returns {boolean}
 */
function hasPermission(config, role, permissionGroup, senderID) {
  const id = String(senderID);

  const admins = Array.isArray(config.admins) ? config.admins.map(String) : [];

  if (admins.includes(id)) return true;

  if (role === 0 && !permissionGroup) return true;

  if (role === 1) return admins.includes(id);

  if (permissionGroup) {
    const groups = config.permissionGroups || {};
    const members = Array.isArray(groups[permissionGroup])
      ? groups[permissionGroup].map(String)
      : [];
    return members.includes(id);
  }

  return false;
}

module.exports = { hasPermission };
