const jwt = require('jsonwebtoken');

/**
 * Middleware global de vérification du Token JWT
 */
exports.verifierAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format "Bearer <TOKEN>"

  if (!token) {
    return res.status(401).json({ error: "Accès refusé. Token d'authentification manquant." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // C'est cette ligne qui évite le "undefined" dans les contrôleurs !
    req.user = decoded; 
    
    next();
  } catch (error) {
    return res.status(403).json({ error: "Session expirée ou token invalide. Veuillez vous reconnecter." });
  }
};

/**
 * Garde de sécurité facultatif basé sur les rôles
 */
exports.exigerRoles = (rolesAutorises) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(401).json({ error: "Authentification requise." });
    }
    const aAcces = req.user.roles.some(role => rolesAutorises.includes(role));
    if (!aAcces) {
      return res.status(403).json({ error: "Accès interdit pour votre rôle." });
    }
    next();
  };
};