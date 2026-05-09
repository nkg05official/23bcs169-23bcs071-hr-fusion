// create a similar AppraisalForm in which
// in first section NAme and Designation and Descipline will be there
// in next section there will be inputs for "Specific field of knowledge" "Current Research Interests"

// in next section there will be title of that decription "Please give information pertaining to the period of appraisal as per the format given below :-"
// below that there will be a table title named 1. INSTRUCTION ELEMENT
// in 1.1 there is 1.1 Teaching
// in 1.1.1 there is Courses taught at UG/PG level

// which gives a table of input "Semester"	"Course Name and Number"	"Lecture Hrs/wk"	"Tutorial Hrs/wk"	"Lab Hrs/wk"	"No of Registererd Students"	"Co-Instructor/ Instructor In charge(if any)" make this table number of rows dynamic and he can add number of rows.

// in 1.1.2 "New Courses/ laboratory experiments introduced and taught" there is again a table of input with columns "Course Name and Numbe" "UG/PG"  "	Year and Semester of first offering"

// 1.1.3 New course material developed/instructional software developed (should be made available on the web / public domain and may be under GIAN/NPTEL/SWAYAM etc)
import React, { useState } from "react";
import { Button } from "@mantine/core";
import {
  User,
  Tag,
  IdentificationCard,
  Calendar,
  ClipboardText,
  CurrencyDollar,
  FileText,
  CheckCircle,
  PaperPlaneRight,
} from "@phosphor-icons/react";
import classes from "./AppraisalForm.module.css";

function AppraisalForm() {
  const [rows, setRows] = useState([
    {
      semester: "",
      courseNameNumber: "",
      lectureHrs: "",
      tutorialHrs: "",
      labHrs: "",
      registeredStudents: "",
      coInstructor: "",
    },
  ]);
  const handleChange = (index, event) => {
    const newRows = [...rows];
    newRows[index][event.target.name] = event.target.value;
    setRows(newRows);
  };
  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        semester: "",
        courseNameNumber: "",
        lectureHrs: "",
        tutorialHrs: "",
        labHrs: "",
        registeredStudents: "",
        coInstructor: "",
      },
    ]);
  };
  const handleSubmit = (event) => {
    event.preventDefault();
  };

  return (
    <div className={classes.AppraisalForm_container}>
      <form onSubmit={handleSubmit}>
        {/* Section 1: Name, Designation, Discipline */}
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
                placeholder="Name"
                className="input"
                required
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
                placeholder="Designation"
                className="input"
                required
              />
            </div>
          </div>
          <div className="grid-col">
            <label className="input-label" htmlFor="discipline">
              Discipline
            </label>
            <div className="input-wrapper">
              <Tag size={20} />
              <input
                type="text"
                id="discipline"
                name="discipline"
                placeholder="Discipline"
                className="input"
                required
              />
            </div>
          </div>
        </div>
        {/* Section 2: Specific field of knowledge, Current Research Interests */}
        <div className="grid-row">
          <div className="grid-col">
            <label className="input-label" htmlFor="knowledge">
              Specific field of knowledge
            </label>
            <div className="input-wrapper">
              <ClipboardText size={20} />
              <input
                type="text"
                id="knowledge"
                name="knowledge"
                placeholder="Specific field of knowledge"
                className="input"
                required
              />
            </div>
          </div>
          <div className="grid-col">
            <label className="input-label" htmlFor="researchInterests">
              Current Research Interests
            </label>
            <div className="input-wrapper">
              <ClipboardText size={20} />
              <input
                type="text"
                id="researchInterests"
                name="researchInterests"
                placeholder="Current Research Interests"
                className="input"
                required
              />
            </div>
          </div>
        </div>
        {/* Section 3: Instruction Element */}
        <div className="section-divider">
          <hr className="divider-line" />
          <h3 className="section-heading">Instruction Element</h3>
        </div>
        <div className="section-title">
          <h4 className="section-title">
            Please give information pertaining to the period of appraisal as per
            the format given below:
          </h4>
        </div>
        <div className="section-subtitle">
          <h5 className="section-subtitle">1. Teaching</h5>
        </div>
        <div className="section-subsubtitle">
          <h6 className="section-subsubtitle">
            1.1 Courses taught at UG/PG level
          </h6>
        </div>
        {rows.map((row, index) => (
          <div key={index} className="grid-row">
            <div className="grid-col">
              <label className="input-label" htmlFor={`semester_${index}`}>
                Semester
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id={`semester_${index}`}
                  name="semester"
                  placeholder="Semester"
                  value={row.semester}
                  onChange={(e) => handleChange(index, e)}
                  className="input"
                  required
                />
              </div>
            </div>
            <div className="grid-col">
              <label
                className="input-label"
                htmlFor={`courseNameNumber_${index}`}
              >
                Course Name and Number
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id={`courseNameNumber_${index}`}
                  name="courseNameNumber"
                  placeholder="Course Name and Number"
                  value={row.courseNameNumber}
                  onChange={(e) => handleChange(index, e)}
                  className="input"
                  required
                />
              </div>
            </div>
            <div className="grid-col">
              <label className="input-label" htmlFor={`lectureHrs_${index}`}>
                Lecture Hrs/wk
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id={`lectureHrs_${index}`}
                  name="lectureHrs"
                  placeholder="Lecture Hrs/wk"
                  value={row.lectureHrs}
                  onChange={(e) => handleChange(index, e)}
                  className="input"
                  required
                />
              </div>
            </div>
            <div className="grid-col">
              <label className="input-label" htmlFor={`tutorialHrs_${index}`}>
                Tutorial Hrs/wk
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id={`tutorialHrs_${index}`}
                  name="tutorialHrs"
                  placeholder="Tutorial Hrs/wk"
                  value={row.tutorialHrs}
                  onChange={(e) => handleChange(index, e)}
                  className="input"
                  required
                />
              </div>
            </div>
            <div className="grid-col">
              <label className="input-label" htmlFor={`labHrs_${index}`}>
                Lab Hrs/wk
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id={`labHrs_${index}`}
                  name="labHrs"
                  placeholder="Lab Hrs/wk"
                  value={row.labHrs}
                  onChange={(e) => handleChange(index, e)}
                  className="input"
                  required
                />
              </div>
            </div>
            <div className="grid-col">
              <label
                className="input-label"
                htmlFor={`registeredStudents_${index}`}
              >
                No of Registered Students
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id={`registeredStudents_${index}`}
                  name="registeredStudents"
                  placeholder="No of Registered Students"
                  value={row.registeredStudents}
                  onChange={(e) => handleChange(index, e)}
                  className="input"
                  required
                />
              </div>
            </div>
            <div className="grid-col">
              <label className="input-label" htmlFor={`coInstructor_${index}`}>
                Co-Instructor/ Instructor In charge (if any)
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id={`coInstructor_${index}`}
                  name="coInstructor"
                  placeholder="Co-Instructor/ Instructor In charge (if any)"
                  value={row.coInstructor}
                  onChange={(e) => handleChange(index, e)}
                  className="input"
                  required
                />
              </div>
            </div>
          </div>
        ))}
        <Button onClick={handleAddRow} style={{ marginTop: "20px" }}>
          Add Row
        </Button>
        <div className="section-subsubtitle">
          <h6 className="section-subsubtitle">
            1.2 New Courses/ laboratory experiments introduced and taught
          </h6>
        </div>
        <div className="grid-row">
          <div className="grid-col">
            <label className="input-label" htmlFor="newCourseName">
              Course Name and Number
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                id="newCourseName"
                name="newCourseName"
                placeholder="Course Name and Number"
                className="input"
                required
              />
            </div>
          </div>
          <div className="grid-col">
            <label className="input-label" htmlFor="courseLevel">
              UG/PG
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                id="courseLevel"
                name="courseLevel"
                placeholder="UG/PG"
                className="input"
                required
              />
            </div>
          </div>
          <div className="grid-col">
            <label className="input-label" htmlFor="firstOffering">
              Year and Semester of first offering
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                id="firstOffering"
                name="firstOffering"
                placeholder="Year and Semester of first offering"
                className="input"
                required
              />
            </div>
          </div>
        </div>
        <div className="section-subsubtitle">
          <h6 className="section-subsubtitle">
            1.3 New course material developed/instructional software developed
            (should be made available on the web / public domain and may be
            under GIAN/NPTEL/SWAYAM etc)
          </h6>
        </div>
        <div className="grid-row">
          <div className="grid-col">
            <label className="input-label" htmlFor="courseMaterial">
              Course Material
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                id="courseMaterial"
                name="courseMaterial"
                placeholder="Course Material"
                className="input"
                required
              />
            </div>
          </div>
          <div className="grid-col">
            <label className="input-label" htmlFor="softwareDeveloped">
              Instructional Software Developed
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                id="softwareDeveloped"
                name="softwareDeveloped"
                placeholder="Instructional Software Developed"
                className="input"
                required
              />
            </div>
          </div>
        </div>
        {/* Footer */}
        {/* <div className="footer-section">
          <div className="input-wrapper">
            <User size={20} />
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              className="username-input"
              required
            />
          </div>
          <div className="input-wrapper">
            <Tag size={20} />
            <input
              type="text"
              name="designationFooter"
              placeholder="Designation"
              value={formData.designationFooter}
              onChange={handleChange}
              className="designation-input"
              required
            />
          </div>
          <Button
            leftIcon={<CheckCircle size={25} />}
            style={{ marginLeft: "50px", paddingRight: "15px" }}
            className="button"
          >
            <CheckCircle size={18} /> &nbsp; Check
          </Button>
          <Button
            type="submit"
            rightIcon={<PaperPlaneRight size={20} />}
            style={{
              marginLeft: "350px",
              width: "150px",
              paddingRight: "15px",
              borderRadius: "5px",
            }}
            className="button"
          >
            <PaperPlaneRight size={20} /> &nbsp; Submit
          </Button>
        </div> */}
      </form>
    </div>
  );
}

export default AppraisalForm;
