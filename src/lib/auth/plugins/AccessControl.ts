import { createAccessControl } from 'better-auth/plugins/access';
import {
  defaultStatements,
  adminAc,
  memberAc,
  ownerAc,
} from 'better-auth/plugins/organization/access';

export const permissionStatement = {
  ...defaultStatements,
  posting: ['create', 'share', 'update', 'delete', 'archive', 'transfer'],
  application: ['create', 'share', 'update', 'delete', 'archive', 'transfer'],
  profile: ['create', 'share', 'update', 'delete', 'archive', 'transfer'],
  control: ['create', 'share', 'update', 'delete', 'archive', 'transfer'],
  storage: ['create', 'share', 'update', 'delete'],
  view: ['posting', 'application', 'profile', 'organization'],
} as const;

export const JobsAC = createAccessControl(permissionStatement);

export const SuperAdmin = JobsAC.newRole({
  posting: ['create', 'share', 'update', 'delete', 'archive', 'transfer'],
  application: ['create', 'share', 'update', 'delete', 'archive', 'transfer'],
  profile: ['create', 'share', 'update', 'delete', 'archive', 'transfer'],
  control: ['create', 'share', 'update', 'delete', 'archive', 'transfer'],
  storage: ['create', 'share', 'update', 'delete'],
  view: ['posting', 'application', 'profile', 'organization'],
  ...ownerAc.statements,
});

export const Admin = JobsAC.newRole({
  posting: ['create', 'share', 'update', 'delete', 'archive'],
  application: ['create', 'share', 'update', 'delete', 'archive'],
  profile: ['create', 'share', 'update', 'delete', 'archive'],
  control: ['create', 'share', 'update', 'delete', 'archive'],
  storage: ['create', 'share', 'update', 'delete'],
  view: ['posting', 'application', 'profile', 'organization'],
  ...adminAc.statements,
});

export const Recruiter = JobsAC.newRole({
  posting: ['create', 'share', 'update', 'delete', 'archive'],
  application: ['create', 'share', 'update', 'delete', 'archive'],
  profile: ['create', 'share', 'update', 'delete', 'archive'],
  storage: ['create', 'delete'],
  view: ['posting', 'application', 'profile'],
  ...memberAc.statements,
});

export const Member = JobsAC.newRole({
  posting: ['create', 'share', 'update', 'delete', 'archive'],
  application: ['create', 'share', 'update', 'delete', 'archive'],
  profile: ['create', 'share', 'update', 'delete', 'archive'],
  storage: ['create', 'delete'],
  view: ['posting', 'application', 'profile'],
  ...memberAc.statements,
});

export const Seeker = JobsAC.newRole({
  application: ['create', 'share', 'update', 'delete', 'archive'],
  profile: ['create', 'share', 'update', 'delete', 'archive'],
  storage: ['create', 'delete'],
  view: ['posting', 'application', 'profile'],
});

export const Viewer = JobsAC.newRole({
  application: ['share'],
  profile: ['create', 'share', 'update', 'delete', 'archive'],
  storage: ['create', 'delete'],
  view: ['posting', 'application'],
});
