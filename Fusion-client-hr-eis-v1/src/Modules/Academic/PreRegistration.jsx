import React, { useState, useEffect, useCallback, memo } from "react";
import {
  Card,
  Text,
  Button,
  Alert,
  Loader,
  Center,
  Modal,
} from "@mantine/core";
import axios from "axios";
import {
  preCourseRegistrationRoute,
  preCourseRegistrationSubmitRoute,
} from "../../routes/academicRoutes";

const CourseRow = memo(
  ({
    rowData,
    onPriorityChange,
    priorityValue,
    slotPriorities,
    slotRowSpan,
    readOnly,
  }) => {
    const {
      isFirst,
      slotName,
      slotType,
      semester,
      slotId,
      course,
      slotLength,
    } = rowData;

    const options = Array.from({ length: slotLength }, (_, i) => {
      const optionValue = `${i + 1}`;
      let isDisabled = false;
      if (slotPriorities) {
        Object.entries(slotPriorities).forEach(([cId, val]) => {
          if (cId !== course.id.toString() && val === optionValue) {
            isDisabled = true;
          }
        });
      }
      return (
        <option key={optionValue} value={optionValue} disabled={isDisabled}>
          {optionValue}
        </option>
      );
    });

    return (
      <tr>
        {isFirst && (
          <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }} rowSpan={slotRowSpan}>
            {slotName} <br />({slotType}, Sem: {semester})
          </td>
        )}
        <td style={{ border: "1px solid #ccc", padding: "8px" }}>
          {course.code}: {course.name} ({course.credits} credits)
        </td>
        <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>
          {readOnly ? (
            <Text>{priorityValue || "Not Selected"}</Text>
          ) : (
            <select
              value={priorityValue || ""}
              onChange={(e) =>
                onPriorityChange(slotId, course.id, e.target.value)
              }
              style={{
                width: "120px",
                padding: "4px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                backgroundColor: "#fff",
              }}
            >
              <option value="">Select</option>
              {options}
            </select>
          )}
        </td>
      </tr>
    );
  },
  (prevProps, nextProps) =>
    prevProps.priorityValue === nextProps.priorityValue &&
    prevProps.rowData === nextProps.rowData &&
    JSON.stringify(prevProps.slotPriorities) === JSON.stringify(nextProps.slotPriorities) &&
    prevProps.readOnly === nextProps.readOnly
);

const BacklogCourseRow = ({
  slot,
  selectedCourseId,
  selectedPrevRegId,
  onSelectCourse,
  onSelectPrevReg,
  usedCourseIds,
  usedPrevRegIds,
  readOnly = false,
}) => {
  const selectedCourse = slot.course_choices.find(
    (c) => c.id.toString() === selectedCourseId
  );
  const selectedPrevReg = slot.prev_registrations.find(
    (r) => r.id.toString() === selectedPrevRegId
  );

  return (
    <tr>
      <td style={{ border: "1px solid #ccc", padding: "8px" }}>
        {slot.slot_name}
      </td>
      <td style={{ border: "1px solid #ccc", padding: "8px" }}>
        {readOnly ? (
          selectedCourse ? (
            `${selectedCourse.code} - ${selectedCourse.name}`
          ) : (
            "Not selected"
          )
        ) : (
          <select
            value={selectedCourseId || ""}
            onChange={(e) => onSelectCourse(slot.sno, e.target.value)}
            style={{width:'100%'}}
          >
            <option value="">Select Course</option>
            {slot.course_choices.map((course) => (
              <option
                key={course.id}
                value={course.id}
                disabled={usedCourseIds.includes(course.id.toString())}
              >
                {course.code} - {course.name}
              </option>
            ))}
          </select>
        )}
      </td>
      <td style={{ border: "1px solid #ccc", padding: "8px" }}>
        {readOnly ? (
          selectedPrevReg ? (
            `${selectedPrevReg.course_id.code} - ${selectedPrevReg.course_id.name} - sem - ${selectedPrevReg.semester_id?.semester_no}`
          ) : (
            "Not selected"
          )
        ) : (
          <select
            value={selectedPrevRegId || ""}
            onChange={(e) => onSelectPrevReg(slot.sno, e.target.value)}
            style={{width:'100%'}}
          >
            <option value="">Select Previous Registration</option>
            {slot.prev_registrations.map((reg) => (
              <option
                key={reg.id}
                value={reg.id}
                disabled={usedPrevRegIds.includes(reg.id.toString())}
              >
                {reg.course_id.code} - {reg.course_id.name} - sem -{" "}
                {reg.semester_id?.semester_no}
              </option>
            ))}
          </select>
        )}
      </td>
    </tr>
  );
};

function PreRegistration() {
  const [coursesData, setCoursesData] = useState([]);
  const [backlogSlots, setBacklogSlots] = useState([]);
  const [backlogSelections, setBacklogSelections] = useState({});
  const [priorities, setPriorities] = useState({});
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [backlogSlotsReg, setBacklogSlotsReg] = useState([]);

  const fetchCourses = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError(new Error("No token found"));
      setLoading(false);
      return;
    }
    try {
      setLoading(true)
      const response = await axios.get(preCourseRegistrationRoute, {
        headers: { Authorization: `Token ${token}` },
      });

      if (response.data.message) {
        setAlreadyRegistered(true);
        setCoursesData(response.data.data.filter((slot)=> !slot.slot_name.startsWith('BL')))
        setBacklogSlotsReg(response.data.backlog_data);
        const newPriorities = {};
        response.data.data.forEach((slot) => {
          const slotPriority = {};
          slot.course_choices.forEach((course) => {
            if (course.priority) {
              slotPriority[course.id] = course.priority;
            }
          });
          newPriorities[slot.sno] = slotPriority;
        });
        setPriorities(newPriorities);
      } else {
        setCoursesData(response.data.filter((slot) => slot.slot_type !== "Backlog"));
        setBacklogSlots(response.data.filter((slot) => slot.slot_type === "Backlog"));
      }
    } catch (fetchError) {
      setError(fetchError?.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handlePriorityChange = useCallback((slotId, courseId, value) => {
    setPriorities((prev) => ({
      ...prev,
      [slotId]: {
        ...(prev[slotId] || {}),
        [courseId]: value,
      },
    }));
  }, []);

  const handleBacklogCourseChange = (slotId, courseId) => {
    setBacklogSelections((prev) => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        courseId,
      },
    }));
  };

  const handleBacklogPrevRegChange = (slotId, prevRegistrationId) => {
    setBacklogSelections((prev) => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        prevRegistrationId,
      },
    }));
  };

  const isFormComplete = () => {
    const allCoursesValid = coursesData.every((slot) => {
      const slotPriorities = priorities[slot.sno] || {};
      return slot.course_choices.every(
        (course) => slotPriorities[course.id] && slotPriorities[course.id] !== ""
      );
    });

    const allBacklogsValid = backlogSlots.every((slot) => {
      const backlog = backlogSelections[slot.sno] || {};
      const courseSelected = !!backlog.courseId;
      const prevSelected = !!backlog.prevRegistrationId;
      return !courseSelected || (courseSelected && prevSelected);
    });

    return allCoursesValid && allBacklogsValid;
  };

  const handleRegister = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError(new Error("No token found"));
      return;
    }

    const registrations = [];
    coursesData.forEach((slot) => {
      const slotPriorities = priorities[slot.sno] || {};
      slot.course_choices.forEach((course) => {
        registrations.push({
          slot_id: slot.sno,
          course_id: course.id,
          priority: slotPriorities[course.id],
        });
      });
    });

    const backlogRegistrations = Object.entries(backlogSelections)
      .filter(([_, { courseId, prevRegistrationId }]) => courseId && prevRegistrationId)
      .map(([slotId, { courseId, prevRegistrationId }]) => ({
        slot_id: parseInt(slotId),
        course_id: parseInt(courseId),
        prev_registration_id: parseInt(prevRegistrationId),
        priority: 1,
      }));

    try {
      const response = await axios.post(
        preCourseRegistrationSubmitRoute,
        {
          registrations,
          backlog_registrations: backlogRegistrations,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
        }
      );
      if (response.status === 200 || response.status === 201) {
        fetchCourses();
        setAlertVisible(true);
      }
    } catch (postError) {
      console.error("Error:", postError);
      setError(postError);
    }
  };

  const rows = [];
  let serialNumber = 1;
  coursesData.forEach((slot) => {
    const slotLength = slot.course_choices.length;
    slot.course_choices.forEach((course, index) => {
      rows.push({
        serial: index === 0 ? serialNumber++ : "",
        isFirst: index === 0,
        slotId: slot.sno,
        slotName: slot.slot_name,
        slotType: slot.slot_type,
        semester: slot.semester,
        slotLength,
        course,
      });
    });
  });

  const usedCourseIds = Object.values(backlogSelections).map((s) => s.courseId).filter(Boolean);
  const usedPrevRegIds = Object.values(backlogSelections).map((s) => s.prevRegistrationId).filter(Boolean);

  if (loading)
    return (
      <Center mt="lg">
        <Loader color="blue" size="xl" variant="bars" />
      </Center>
    );

  if (error)
    return (
      <Alert color="yellow" title="Message" mb="lg">
        {error}
      </Alert>
    );

  return (
    <>
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Text align="center" size="lg" weight={700} mb="md" color="blue">
          Pre-Registration for Next Semester Courses
        </Text>

        {alreadyRegistered && (
          <Alert color="blue" title="Already Registered" mb="lg">
            You have already completed pre-registration. Your courses with assigned priorities are shown below.
          </Alert>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Slot Name</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Course</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Priority</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <CourseRow
                key={index}
                rowData={row}
                onPriorityChange={handlePriorityChange}
                priorityValue={priorities[row.slotId]?.[row.course.id] || ""}
                slotPriorities={priorities[row.slotId] || {}}
                slotRowSpan={row.slotLength}
                readOnly={alreadyRegistered}
              />
            ))}
          </tbody>
        </table>


        {alreadyRegistered && backlogSlotsReg.length > 0 && (
          <>
            <Text weight={600} mt="lg"><b>Backlog Registrations</b></Text>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "0.5rem" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Slot</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Course</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Previous Registration</th>
                </tr>
              </thead>
              <tbody>
                {backlogSlotsReg.map((slot) => {
                  const course = slot.course_choices?.[0];
                  const prev = slot.prev_registration;

                  return (
                    <tr key={`backlog-${slot.sno}`}>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{slot.slot_name}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                        {course ? `${course.code} - ${course.name}` : "Not selected"}
                      </td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                        {prev && prev.code
                          ? `${prev.code} - ${prev.name} (Sem ${prev.semester_no})`
                          : "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {!alreadyRegistered && backlogSlots.length > 0 && (
          <>
            <Text mt="xl" size="lg" weight={600} color="blue">
              Backlog Course Registration
            </Text>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Slot</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Select Course</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Select Previous Registration</th>
                </tr>
              </thead>
              <tbody>
                {backlogSlots.map((slot) => (
                  <BacklogCourseRow
                    key={slot.sno}
                    slot={slot}
                    selectedCourseId={backlogSelections[slot.sno]?.courseId || ""}
                    selectedPrevRegId={backlogSelections[slot.sno]?.prevRegistrationId || ""}
                    onSelectCourse={handleBacklogCourseChange}
                    onSelectPrevReg={handleBacklogPrevRegChange}
                    usedCourseIds={usedCourseIds}
                    usedPrevRegIds={usedPrevRegIds}
                    readOnly={alreadyRegistered}
                  />
                ))}
              </tbody>
            </table>
          </>
        )}

        {!alreadyRegistered && (
          <Button
            mt="md"
            style={{ backgroundColor: "#3B82F6", color: "#fff" }}
            onClick={() => setConfirmModalOpen(true)}
            disabled={!isFormComplete()||loading}
          >
            Register
          </Button>
        )}

        {alertVisible && (
          <Alert
            mt="lg"
            title="Registration Complete"
            color="green"
            withCloseButton
            onClose={() => setAlertVisible(false)}
          >
            Registration preferences have been submitted.
          </Alert>
        )}
      </Card>

      <Modal
        opened={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Registration"
        size="xl"
      >
        <Text weight={500} mb="sm"><b>Please review your selections before confirming:</b></Text>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "0.5rem" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Slot Name</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Course</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Priority</th>
            </tr>
          </thead>
          <tbody>
            {coursesData.map((slot) =>
              slot.course_choices.map((course, index) => (
                <tr key={`${slot.sno}-${course.id}`}>
                  {index === 0 && (
                    <td
                      rowSpan={slot.course_choices.length}
                      style={{ border: "1px solid #ccc", padding: "8px", verticalAlign: "top" }}
                    >
                      {slot.slot_name}
                    </td>
                  )}
                  <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                    {course.code} - {course.name}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>
                    {priorities[slot.sno]?.[course.id] || "Not selected"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {backlogSlots.length > 0 && (
          <>
            <Text weight={600} mt="lg"><b>Backlog Registrations</b></Text>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "0.5rem" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Slot</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Course</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Previous Registration</th>
                </tr>
              </thead>
              <tbody>
                {backlogSlots.map((slot) => {
                  const selection = backlogSelections[slot.sno];
                  const selectedCourse = slot.course_choices.find((c) => c.id.toString() === selection?.courseId);
                  const selectedPrev = slot.prev_registrations.find((r) => r.id.toString() === selection?.prevRegistrationId);

                  return (
                    <tr key={`backlog-${slot.sno}`}>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{slot.slot_name}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                        {selectedCourse ? `${selectedCourse.code} - ${selectedCourse.name}` : "Not selected"}
                      </td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                        {selectedPrev ? `Semester ${selectedPrev.semester_id?.semester_no}` : "Not selected"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        <Button
          mt="md"
          fullWidth
          onClick={() => {
            setConfirmModalOpen(false);
            handleRegister();
          }}
          color="blue"
        >
          Confirm and Submit
        </Button>
      </Modal>
    </>
  );
}

export default PreRegistration;
