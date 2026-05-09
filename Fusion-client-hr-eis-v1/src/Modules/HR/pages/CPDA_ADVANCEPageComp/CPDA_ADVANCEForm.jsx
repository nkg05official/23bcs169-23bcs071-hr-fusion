import React, { useEffect, useState } from "react";
import { Button } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import {
  PaperPlaneRight,
  CheckCircle,
  User,
  Tag,
  IdentificationCard,
  Calendar,
  ClipboardText,
  CurrencyDollar,
  FileText,
} from "@phosphor-icons/react";
import { useDispatch, useSelector } from "react-redux";
import { updateForm, resetForm } from "../../../../redux/formSlice";
import {
  get_form_initials,
  submit_cpda_adv_form,
} from "../../../../routes/hr";
import {
  fetchJsonWithAuth,
  searchEmployees,
  submitJsonWithAuth,
} from "../../services/hrService";
import { selectHrForm } from "../../selectors";
import "./CPDA_ADVANCEForm.css";

const CPDA_ADVANCEForm = () => {
  const formData = useSelector(selectHrForm);
  const dispatch = useDispatch();
  const [verifiedReceiver, setVerifiedReceiver] = useState(false);

  // set formData to initial state
  useEffect(() => {
    const fetchMyDetails = async () => {
      try {
        const fetchedData = await fetchJsonWithAuth(
          get_form_initials,
          "Failed to fetch user details.",
        );
        dispatch(updateForm({ name: "name", value: fetchedData.name || "" }));
        dispatch(
          updateForm({ name: "designation", value: fetchedData.last_selected_role || "" }),
        );
        dispatch(updateForm({ name: "pfNo", value: fetchedData.pfno || "" }));
      } catch (error) {

        showNotification({
          color: "red",
          title: "Error",
          message: error?.message || "Failed to fetch user details.",
        });
      }
    };
    fetchMyDetails();
  }, []);
  const handleCheck = async () => {
    if (!formData.username_reciever || formData.username_reciever.trim() === "") {
      showNotification({
        color: "red",
        title: "Receiver required",
        message: "Please enter a receiver's username to check.",
      });
      return;
    }

    try {
      const employees = await searchEmployees(formData.username_reciever);
      const firstMatch = employees?.[0];
      if (!firstMatch) {
        showNotification({
          color: "red",
          title: "Receiver not found",
          message: "Please check the username and try again.",
        });
        return;
      }

      dispatch(
        updateForm({
          name: "username_reciever",
          value: firstMatch.username,
        }),
      );
      dispatch(
        updateForm({
          name: "designation_reciever",
          value: firstMatch.designation,
        }),
      );
      setVerifiedReceiver(true);
      showNotification({
        color: "green",
        title: "Receiver verified",
        message: "Receiver verified successfully.",
      });
    } catch (error) {

      showNotification({
        color: "red",
        title: "Verification failed",
        message: error?.message || "Failed to fetch receiver data.",
      });
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    dispatch(updateForm({ name, value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // Ensure receiver is verified
    if (!verifiedReceiver) {
      showNotification({
        color: "red",
        title: "Receiver verification required",
        message: "Please verify the receiver's designation before submitting.",
      });
      return;
    }

    // Check required fields and alert if any are blank
    const requiredFields = [
      { name: "name", label: "Name" },
      { name: "designation", label: "Designation" },
      { name: "pfNo", label: "PF Number" },
      { name: "purpose", label: "Purpose" },
      { name: "amountRequired", label: "Amount Required" },
      { name: "submissionDate", label: "Submission Date" },
    ];

    for (let field of requiredFields) {
      if (!formData[field.name] || formData[field.name] === "") {
        showNotification({
          color: "red",
          title: "Missing required field",
          message: `${field.label} is required.`,
        });
        return;
      }
    }

    // Convert string fields to numbers if necessary and create processed data
    const processedData = {
      name: formData.name,
      designation: formData.designation,
      pfNo: parseInt(formData.pfNo, 10),
      purpose: formData.purpose,
      amountRequired: parseInt(formData.amountRequired, 10),
      submissionDate: formData.submissionDate,
      advanceDueAdjustment: formData.advanceDueAdjustment
        ? parseFloat(formData.advanceDueAdjustment)
        : null,
      balanceAvailable: formData.balanceAvailable
        ? parseFloat(formData.balanceAvailable)
        : null,
      advanceAmountPDA: formData.advanceAmountPDA
        ? parseFloat(formData.advanceAmountPDA)
        : null,
      amountCheckedInPDA: formData.amountCheckedInPDA
        ? parseFloat(formData.amountCheckedInPDA)
        : null,
    };



    // Submit form data
    const submitForm = async () => {
      try {
        await submitJsonWithAuth(
          `${submit_cpda_adv_form}?username_reciever=${encodeURIComponent(formData.username_reciever || "")}`,
          processedData,
          "Failed to submit CPDA advance form.",
        );
        showNotification({
          color: "green",
          title: "Success",
          message: "CPDA Advance form submitted successfully.",
        });
        dispatch(resetForm());
      } catch (error) {

        showNotification({
          color: "red",
          title: "Submission failed",
          message: error?.message || "Failed to submit CPDA Advance form.",
        });
      }
    };
    submitForm();
  };

  return (
    <div className="CPDA_ADVANCEForm_container">
      <form onSubmit={handleSubmit}>
        {/* Row 1: Name and Designation */}
        <div className="grid-row">
          <div className="grid-col">
            <label className="input-label" htmlFor="name">
              Name
            </label>
            <div className="input-wrapper">
              <User size={20} />
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name} // Auto-fetched from backend
                className="input"
                disabled
              />
            </div>
          </div>

          <div className="grid-col">
            <label className="input-label" htmlFor="designation">
              Designation
            </label>
            <div className="input-wrapper">
              <Tag size={20} />
              <input
                type="text"
                id="designation"
                name="designation"
                value={formData.designation}
                className="input"
                disabled
              />
            </div>
          </div>
        </div>

        {/* Row 2: Amount Required and Date */}
        <div className="grid-row">
          <div className="grid-col">
            <label className="input-label" htmlFor="amountRequired">
              Amount Required
            </label>
            <div className="input-wrapper">
              <CurrencyDollar size={20} />
              <input
                type="number"
                id="amountRequired"
                name="amountRequired"
                placeholder="Amount Required"
                value={formData.amountRequired || ""}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid-col">
            <label className="input-label" htmlFor="submissionDate">
              Date
            </label>
            <div className="input-wrapper">
              <Calendar size={20} />
              <input
                type="date"
                id="submissionDate"
                name="submissionDate"
                value={formData.submissionDate || ""}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
          </div>
        </div>

        {/* Row 3: Purpose and PF Number */}
        <div className="grid-row">
          <div className="grid-col" style={{ flexGrow: 2 }}>
            <label className="input-label" htmlFor="purpose">
              Purpose
            </label>
            <div className="input-wrapper">
              <ClipboardText size={20} />
              <input
                type="text"
                id="purpose"
                name="purpose"
                placeholder="Purpose"
                value={formData.purpose || ""}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid-col">
            <label className="input-label" htmlFor="pfNo">
              PF Number
            </label>
            <div className="input-wrapper">
              <IdentificationCard size={20} />
              <input
                type="text"
                id="pfNo"
                name="pfNo"
                placeholder="XXXXXXXXXXXX"
                value={formData.pfNo || ""}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>
          <div className="grid-col">
            <label className="input-label" htmlFor="advanceDueAdjustment">
              Advance (PDA) due for adjustment (if any)
            </label>
            <div className="input-wrapper">
              <CurrencyDollar size={20} />
              <input
                type="text"
                id="advanceDueAdjustment"
                name="advanceDueAdjustment"
                placeholder="Advance Due"
                value={formData.advanceDueAdjustment || ""}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Row 4: Estt. Section */}
        <div className="section-divider">
          <hr className="divider-line" />
          <h3 className="section-heading">Estt. Section</h3>
        </div>
        <div className="grid-row">
          <div className="grid-col">
            <label className="input-label" htmlFor="balanceAvailable">
              Balance available as on date
            </label>
            <div className="input-wrapper">
              <CurrencyDollar size={20} />
              <input
                type="number"
                id="balanceAvailable"
                name="balanceAvailable"
                value={formData.balanceAvailable || ""}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>
          <div className="grid-col">
            <label className="input-label" htmlFor="advanceAmountPDA">
              Advance amount entered in PDA Register page no.
            </label>
            <div className="input-wrapper">
              <FileText size={20} />
              <input
                type="number"
                id="advanceAmountPDA"
                name="advanceAmountPDA"
                placeholder="Enter amount"
                value={formData.advanceAmountPDA || ""}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Row 5: Internal Audit */}
        <div className="section-divider">
          <hr className="divider-line" />
          <h3 className="section-heading">Internal Audit</h3>
        </div>
        <div className="grid-row">
          <div className="grid-col">
            <label className="input-label" htmlFor="amountCheckedInPDA">
              Entry checked in PDA Register for Rs.
            </label>
            <div className="input-wrapper">
              <FileText size={20} />
              <input
                type="number"
                id="amountCheckedInPDA"
                name="amountCheckedInPDA"
                placeholder="PDA Register Entry"
                value={formData.amountCheckedInPDA || ""}
                onChange={handleChange}
                className="input"
                style={{ maxWidth: "50%" }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer-section">
          <div className="input-wrapper">
            <User size={20} />
            <input
              type="text"
              name="username_reciever"
              placeholder="Receiver's Username"
              value={formData.username_reciever || ""}
              onChange={handleChange}
              className="username-input"
              required
            />
          </div>
          <div className="input-wrapper">
            <Tag size={20} />
            <input
              type="text"
              name="designation_reciever"
              placeholder="Designation"
              value={formData.designation_reciever || ""}
              className="designation-input"
              required
              disabled
            />
          </div>
          <Button
            leftSection={<CheckCircle size={25} />}
            style={{ marginLeft: "50px", paddingRight: "15px" }}
            className="button"
            onClick={handleCheck}
          >
            Check
          </Button>
          <Button
            type="submit"
            rightSection={<PaperPlaneRight size={20} />}
            style={{
              marginLeft: "350px",
              width: "150px",
              paddingRight: "15px",
              borderRadius: "5px",
            }}
            className="button"
            disabled={!verifiedReceiver}
          >
            Submit
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CPDA_ADVANCEForm;
