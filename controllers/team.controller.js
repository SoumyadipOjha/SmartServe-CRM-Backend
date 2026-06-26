const User        = require('../models/user.model');
const TeamInvite  = require('../models/team-invite.model');
const emailService = require('../services/email.service');
const logger      = require('../utils/logger');

// Only owners/admins can manage the team
function requireOwnerOrAdmin(req, res, next) {
  if (!['owner', 'admin'].includes(req.user.teamRole)) {
    return res.status(403).json({ message: 'Only account owners and admins can manage the team' });
  }
  next();
}

// GET /api/team — list team members
exports.getTeam = async (req, res) => {
  try {
    // The owner's id is req.user.id (already resolved via orgId in middleware)
    const ownerId = req.user.id;
    const members = await User.find({
      $or: [
        { _id: ownerId },
        { organizationOwner: ownerId },
      ],
    }).select('name email teamRole organizationOwner createdAt');
    res.json(members);
  } catch (err) {
    logger.error({ err: err.message }, 'getTeam');
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/team/invites — list pending invites
exports.getInvites = [requireOwnerOrAdmin, async (req, res) => {
  try {
    const invites = await TeamInvite.find({ invitedBy: req.user.id, accepted: false })
      .sort('-createdAt');
    res.json(invites);
  } catch (err) {
    logger.error({ err: err.message }, 'getInvites');
    res.status(500).json({ message: 'Internal server error' });
  }
}];

// POST /api/team/invite — send invite
exports.inviteMember = [requireOwnerOrAdmin, async (req, res) => {
  try {
    const { email, teamRole = 'member' } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Check not already a member
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      const isAlreadyMember =
        existing._id.toString() === req.user.id ||
        (existing.organizationOwner && existing.organizationOwner.toString() === req.user.id);
      if (isAlreadyMember) {
        return res.status(409).json({ message: 'This user is already on your team' });
      }
    }

    // Upsert invite (re-send if already pending)
    const invite = await TeamInvite.findOneAndUpdate(
      { invitedBy: req.user.id, email: email.toLowerCase(), accepted: false },
      { teamRole, $setOnInsert: { invitedBy: req.user.id, email: email.toLowerCase() } },
      { upsert: true, new: true },
    );

    const BASE_URL = process.env.CLIENT_URL || 'http://localhost:3000';
    const inviteLink = `${BASE_URL}/accept-invite?token=${invite.token}`;

    // Fetch inviter's name for the email
    const inviter = await User.findById(req.user.ownId).select('name');
    const inviterName = inviter?.name || 'Your teammate';

    // Send invite email (best-effort)
    try {
      await emailService.sendInviteEmail({
        to:          email,
        inviterName,
        teamRole,
        inviteLink,
      });
    } catch (mailErr) {
      logger.warn({ err: mailErr.message }, 'Invite email send failed');
    }

    res.status(201).json({ invite, inviteLink });
  } catch (err) {
    logger.error({ err: err.message }, 'inviteMember');
    res.status(500).json({ message: 'Internal server error' });
  }
}];

// DELETE /api/team/invites/:inviteId — revoke invite
exports.revokeInvite = [requireOwnerOrAdmin, async (req, res) => {
  try {
    await TeamInvite.findOneAndDelete({ _id: req.params.inviteId, invitedBy: req.user.id });
    res.json({ message: 'Invite revoked' });
  } catch (err) {
    logger.error({ err: err.message }, 'revokeInvite');
    res.status(500).json({ message: 'Internal server error' });
  }
}];

// PATCH /api/team/members/:memberId/role — change a member's role
exports.updateMemberRole = [requireOwnerOrAdmin, async (req, res) => {
  try {
    const { teamRole } = req.body;
    if (!['admin','member'].includes(teamRole)) {
      return res.status(400).json({ message: 'Invalid role. Must be admin or member' });
    }
    const member = await User.findOneAndUpdate(
      { _id: req.params.memberId, organizationOwner: req.user.id },
      { teamRole },
      { new: true },
    ).select('name email teamRole');
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json(member);
  } catch (err) {
    logger.error({ err: err.message }, 'updateMemberRole');
    res.status(500).json({ message: 'Internal server error' });
  }
}];

// DELETE /api/team/members/:memberId — remove a member
exports.removeMember = [requireOwnerOrAdmin, async (req, res) => {
  try {
    const member = await User.findOneAndUpdate(
      { _id: req.params.memberId, organizationOwner: req.user.id },
      { organizationOwner: null, teamRole: 'owner' }, // they become standalone
      { new: true },
    );
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json({ message: 'Member removed from team' });
  } catch (err) {
    logger.error({ err: err.message }, 'removeMember');
    res.status(500).json({ message: 'Internal server error' });
  }
}];

// POST /api/team/accept — accept an invitation (called during signup)
// body: { token, name, password? } — creates or links the user account
exports.acceptInvite = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Invite token is required' });

    const invite = await TeamInvite.findOne({ token, accepted: false });
    if (!invite) return res.status(404).json({ message: 'Invite not found or already used' });
    if (invite.expiresAt < new Date()) return res.status(410).json({ message: 'Invite has expired' });

    const owner = await User.findById(invite.invitedBy);
    if (!owner) return res.status(404).json({ message: 'Inviting account no longer exists' });

    // Find or create the invited user
    let member = await User.findOne({ email: invite.email });
    if (!member) {
      member = await User.create({
        name:              req.body.name || invite.email,
        email:             invite.email,
        teamRole:          invite.teamRole,
        organizationOwner: invite.invitedBy,
        role:              'user',
      });
    } else {
      member.teamRole          = invite.teamRole;
      member.organizationOwner = invite.invitedBy;
      await member.save();
    }

    await TeamInvite.updateOne({ _id: invite._id }, { accepted: true });

    // Issue JWT for the new member
    const { generateToken } = require('./auth.controller');
    const jwt_token = generateToken(member);
    res.json({ token: jwt_token, user: member });
  } catch (err) {
    logger.error({ err: err.message }, 'acceptInvite');
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/team/invite-info/:token — get invite details (pre-signup)
exports.getInviteInfo = async (req, res) => {
  try {
    const invite = await TeamInvite.findOne({ token: req.params.token, accepted: false })
      .populate('invitedBy', 'name email');
    if (!invite) return res.status(404).json({ message: 'Invite not found or already used' });
    if (invite.expiresAt < new Date()) return res.status(410).json({ message: 'Invite has expired' });
    res.json({ email: invite.email, teamRole: invite.teamRole, invitedBy: invite.invitedBy });
  } catch (err) {
    logger.error({ err: err.message }, 'getInviteInfo');
    res.status(500).json({ message: 'Internal server error' });
  }
};
