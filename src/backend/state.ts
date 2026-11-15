const state = globalThis as typeof globalThis & {
  deletedDonationIds?: Set<string>;
};

export const deletedDonationIds =
  state.deletedDonationIds || (state.deletedDonationIds = new Set<string>());
