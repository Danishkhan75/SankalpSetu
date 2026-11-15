export const PANEL_PROFILES: Record<
  string,
  { uid: string; email: string; name: string; role: string }
> = {
  admin: {
    uid: 'demo-admin-uid',
    email: 'khandanish0503@gmail.com',
    name: 'Danish Khan',
    role: 'admin',
  },
  donor: {
    uid: 'donator-fundraiser-uid',
    email: 'rehan.donator@graminseva.in',
    name: 'Rehan Siddiqui (Donator & Fundraiser)',
    role: 'donor',
  },
  fundraiser: {
    uid: 'fundraiser-uid',
    email: 'fundraiser@sankalpsetu.org',
    name: 'Verified Fundraiser',
    role: 'fundraiser',
  },
  user: {
    uid: 'village-beneficiary-uid',
    email: 'rameshwar.village@graminseva.in',
    name: 'Rameshwar Patil (Village Applicant)',
    role: 'user',
  },
};
