const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/team.controller');
const { authenticateJWT } = require('../middleware/auth.middleware');

// Public — invite acceptance (no auth needed, issues its own JWT)
router.get('/invite-info/:token',  ctrl.getInviteInfo);
router.post('/accept',             ctrl.acceptInvite);

// Authenticated team management
router.use(authenticateJWT);
router.get('/',                              ctrl.getTeam);
router.get('/invites',                       ctrl.getInvites);
router.post('/invite',                       ctrl.inviteMember);
router.delete('/invites/:inviteId',          ctrl.revokeInvite);
router.patch('/members/:memberId/role',      ctrl.updateMemberRole);
router.delete('/members/:memberId',          ctrl.removeMember);

module.exports = router;
