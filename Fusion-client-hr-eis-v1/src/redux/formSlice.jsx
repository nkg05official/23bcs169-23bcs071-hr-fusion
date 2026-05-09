import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  name: "",
  designation: "",
  adjustmentSubmitted: "",
  balanceDate: "",
  advanceTaken: "",
  pfNo: "",
  purpose: "",
  amountCheckedInPDA: "",
  advanceAmountPDA: "",
  username: "",
  designationFooter: "",
};

const formSlice = createSlice({
  name: "form",
  initialState,
  reducers: {
    updateForm: (state, action) => {
      const { name, value } = action.payload;
      state[name] = value;
    },
    resetForm: () => initialState,
  },
});

export const { updateForm, resetForm } = formSlice.actions;
export default formSlice.reducer;
