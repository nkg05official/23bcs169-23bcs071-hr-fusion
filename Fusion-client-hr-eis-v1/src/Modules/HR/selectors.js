export const selectHrRole = (state) => state.user?.role ?? "";

export const selectHrNormalizedRole = (state) =>
  selectHrRole(state).trim().toLowerCase();

export const selectHrForm = (state) => state.form ?? {};