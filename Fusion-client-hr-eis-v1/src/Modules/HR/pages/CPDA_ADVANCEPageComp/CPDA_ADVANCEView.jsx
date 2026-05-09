import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Title } from "@mantine/core";
import LoadingComponent from "../../components/Loading";
import { EmptyTable } from "../../components/tables/EmptyTable";
import HrBreadcrumbs from "../../components/HrBreadcrumbs";
import { view_cpda_adv_form } from "../../../../routes/hr";
import {
  User,
  Tag,
  IdentificationCard,
  Calendar,
  ClipboardText,
  CurrencyDollar,
  FileText,
} from "@phosphor-icons/react";

const CpdaAdvForm = () => {
  const { id } = useParams();
  const [fetchedformData, setfetchedformData] = useState(null);
  const [loading, setLoading] = useState(true);

  const exampleItems = [
    { title: "Home", path: "/dashboard" },
    { title: "Human Resources", path: "/hr" },
    { title: "CPDA Adv", path: "/hr/cpda_adv" },
    { title: "View Form", path: `/hr/cpda_adv/view/${id}` },
  ];

  useEffect(() => {
    const fetchfetchedformData = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${view_cpda_adv_form}/${id}`, {
          headers: { Authorization: `Token ${token}` },
        });

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();
        setfetchedformData(data);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    fetchfetchedformData();
  }, [id]);

  if (loading) {
    return <LoadingComponent />;
  }

  if (!fetchedformData) {
    return (
      <>
        <HrBreadcrumbs items={exampleItems} />
        <EmptyTable message="No view data found." />
      </>
    );
  }

  return (
    <>
      <HrBreadcrumbs items={exampleItems} />
      <Title
        order={2}
        style={{ fontWeight: "500", marginTop: "40px", marginLeft: "15px" }}
      >
        CPDA Advance Form Details
      </Title>
      <div className="CPDA_ADVANCEForm_container">
        {/* add button to track status */}
        <Link
          to={`/hr/FormView/cpda_adv_track/${fetchedformData.file_id}`}
          style={{
            display: "inline-block",
            padding: "10px 20px",
            backgroundColor: "#007bffcc", // Blue background, adjust color as needed
            color: "#fff",
            textDecoration: "none",
            borderRadius: "4px",
            textAlign: "center",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: "20px",
          }}
          // Add hover effect
          // Add hover effect
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#007bff")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#007bffcc")}
        >
          Track Status
        </Link>
        <form>
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
                  value={fetchedformData.name}
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
                  value={fetchedformData.designation}
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
                  value={fetchedformData.amountRequired}
                  className="input"
                  disabled
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
                  value={fetchedformData.submissionDate}
                  className="input"
                  disabled
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
                  value={fetchedformData.purpose}
                  className="input"
                  disabled
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
                  value={fetchedformData.pfNo}
                  disabled
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
                  value={fetchedformData.advanceDueAdjustment}
                  disabled
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Balance Available and Advance Due Adjustment */}
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
                  value={fetchedformData.balanceAvailable}
                  disabled
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
                  value={fetchedformData.advanceAmountPDA}
                  disabled
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
                  value={fetchedformData.amountCheckedInPDA}
                  disabled
                  className="input"
                  style={{ maxWidth: "50%" }}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default CpdaAdvForm;
