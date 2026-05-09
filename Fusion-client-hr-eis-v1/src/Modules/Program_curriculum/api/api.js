/* eslint-disable */
import axios from "axios";
import { host } from "../../../routes/globalRoutes";

const BASE_URL = host;

export const studentFetchSemesterData = async (id) => {
  if (!id) {
    throw new Error("Semester ID is required");
  }

  const response = await axios.get(
    `${BASE_URL}/programme_curriculum/api/semester/${id}`,
  );

  return response.data;
};

export const studentFetchCourseSlotDetails = async (id) => {
  if (!id) {
    throw new Error("Semester ID is required");
  }

  const response = await axios.get(
    `${BASE_URL}/programme_curriculum/api/courseslot/${id}`,
  );

  return response.data;
};

export const fetchAllProgrammes = async () => {
  try {
    const token = localStorage.getItem("authToken");

    if (!token) {
      throw new Error("Authorization token is required");
    }

    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_programmes/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchSemestersOfCurriculumData = async (id) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/curriculum_semesters/${id}/`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchWorkingCurriculumsData = async (token) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_working_curriculums/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchCurriculumData = async (id) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/curriculums/${id}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchDisciplinesData = async () => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_disciplines/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );
    return response.data.disciplines;
  } catch (error) {
    throw error;
  }
};

export const fetchBatchesData = async () => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/batches/list/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );

    return {
      runningBatches: response.data.batches,
      finishedBatches: response.data.finished_batches,
      filter: response.data.filter,
    };
  } catch (error) {
    throw error;
  }
};

export const fetchBatchesSync = async () => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/batches/sync/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );

    if (response.data.success) {
      const mappedBatches = response.data.batches.map(batch => ({
        id: batch.batch_id,
        name: batch.name,
        programme: batch.name,
        discipline: batch.discipline,
        displayBranch: batch.discipline,
        year: batch.year,
        totalSeats: batch.total_seats,
        total_seats: batch.total_seats,
        filledSeats: batch.filled_seats,
        filled_seats: batch.filled_seats,
        student_count: batch.filled_seats,
        availableSeats: batch.available_seats,
        available_seats: batch.available_seats,
        curriculum: batch.curriculum,
        curriculum_name: batch.curriculum,
        curriculumId: batch.curriculum_id,
        curriculum_id: batch.curriculum_id,
        status: batch.status
      }));

      return {
        runningBatches: mappedBatches,
        finishedBatches: [],
        filter: response.data.filter || {},
        total_batches: response.data.total_batches
      };
    } else {
      throw new Error(response.data.message || 'Failed to sync batch data');
    }
  } catch (error) {
    throw error;
  }
};

export const fetchCourseSlotData = async (courseslotId) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_courseslot/${courseslotId}`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchCourseDetails = async (id) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_course/${id}/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchAllCourses = async () => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_courses/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );
    return response.data.courses;
  } catch (error) {
    throw error;
  }
};

export const adminFetchCurriculumSemesters = async (curriculumId, token) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_curriculum_semesters/${curriculumId}`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error.response?.data?.detail || "Failed to fetch curriculum data.";
  }
};

export const adminFetchCurriculumData = async (id) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/curriculums/${id}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const adminFetchCourseInstructorData = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_instructor/`,
    );
    return response.data.course_instructors;
  } catch (error) {
    throw error;
  }
};

export const fetchCourseSlotTypeChoices = async () => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_get_course_slot_type/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const fetchSemesterDetails = async (curriculumId, semesterId) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_get_semesterDetails/?semester_id=${semesterId}&curriculum_id=${curriculumId}`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchProgram = async (programmeId) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_get_program/${programmeId}/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchCourslotData = async (courseslotid) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_edit_courseslot/${courseslotid}/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );

    return response.data.courseslot;
  } catch (error) {
    throw error;
  }
};

export const fetchBatchName = async () => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_get_batch_name/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchDisciplines = async () => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_get_disciplines/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchGetUnlinkedCurriculum = async () => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_get_unlinked_curriculam/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};
export const fetchBatchData = async (batch_id) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_edit_batch/${batch_id}/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchFacultiesData = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/admin_faculties/`,
    );
    return response.data.faculties;
  } catch (error) {
    throw error;
  }
};

export const fetchFacultyCourseProposalData = async (username, designation) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/view_course_proposal_forms/?username=${username}&des=${designation}`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchFacultySuperiorData = async (username, designation) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `${BASE_URL}/programme_curriculum/api/get_superior_data/?uploaderId=${username}&uploaderDes=${designation}`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error("Failed to fetch superior data");
    }

    return response;
  } catch (error) {
    throw error;
  }
};

export const fetchFacultyOutwardFilesData = async (username, designation) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `${BASE_URL}/programme_curriculum/api/outward_files/?username=${username}&des=${designation}`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error("Failed to fetch superior data");
    }

    return response;
  } catch (error) {
    throw error;
  }
};

export const fetchFacultyInwardFilesData = async (username, designation) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `${BASE_URL}/programme_curriculum/api/inward_files/?username=${username}&des=${designation}`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error("Failed to fetch superior data");
    }

    return response;
  } catch (error) {
    throw error;
  }
};
export const fetchFacultyViewInwardFilesData = async (
  fileId,
  username,
  designation,
) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `${BASE_URL}/programme_curriculum/api/view_inward_files/${fileId}/?username=${username}&des=${designation}`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error("Failed to fetch superior data");
    }

    return response;
  } catch (error) {
    throw error;
  }
};
export const fetchFacultyCourseProposalCourseData = async (id) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `${BASE_URL}/programme_curriculum/api/forward_course_forms_II/?id=${id}`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error("Failed to fetch superior data");
    }

    return response;
  } catch (error) {
    throw error;
  }
};

// Process Excel Upload - POST /programme_curriculum/api/process_excel_upload/
export const processExcelUpload = async (file, programmeType) => {
  try {
    const token = localStorage.getItem("authToken");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("programme_type", programmeType);

    const response = await axios.post(
      `${BASE_URL}/programme_curriculum/api/process_excel_upload/`,
      formData,
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Save Students Batch - POST /programme_curriculum/api/save_students_batch/
export const saveStudentsBatch = async (studentsData, programmeType) => {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Authorization token not found");
    }

    const payload = {
      students: studentsData,
      programme_type: programmeType,
    };

    const response = await axios.post(
      `${BASE_URL}/programme_curriculum/api/save_students_batch/`,
      payload,
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

// Add Single Student - POST /programme_curriculum/api/admin_add_single_student/
export const addSingleStudent = async (studentData, programmeType) => {
  try {
    const token = localStorage.getItem("authToken");

    const mappedStudent = {
      name: studentData.name,
      father_name: studentData.fname || studentData.father_name,
      mother_name: studentData.mname || studentData.mother_name,
      jee_app_no: studentData.jeeAppNo || studentData.jee_app_no,
      branch: studentData.branch,
      specialization: studentData.specialization,
      gender: studentData.gender,
      category: studentData.category,
      minority: studentData.minority,
      pwd: studentData.pwd,
      address: studentData.address,
      programme_type: programmeType || "ug",
      phone_number: studentData.phoneNumber || studentData.phone_number,
      personal_email: studentData.email || studentData.personal_email,
      date_of_birth: studentData.dob || studentData.date_of_birth,
      ai_rank: studentData.jeeRank || studentData.ai_rank,
      category_rank: studentData.categoryRank || studentData.category_rank,
      rollNumber: studentData.rollNumber || studentData.roll_number,
      instituteEmail: studentData.instituteEmail || studentData.institute_email,
      roll_number: studentData.rollNumber || studentData.roll_number,
      institute_email:
        studentData.instituteEmail || studentData.institute_email,

      allotted_category:
        studentData.allottedCategory || studentData.allotted_category,
      allotted_gender:
        studentData.allottedGender || studentData.allotted_gender,
      father_occupation:
        studentData.fatherOccupation || studentData.father_occupation,
      father_mobile: studentData.fatherMobile || studentData.father_mobile,
      mother_occupation:
        studentData.motherOccupation || studentData.mother_occupation,
      mother_mobile: studentData.motherMobile || studentData.mother_mobile,
      state: studentData.state,
      tenth_marks: studentData.tenthMarks || studentData.tenth_marks,
      twelfth_marks: studentData.twelfthMarks || studentData.twelfth_marks,
      aadhar_number: studentData.aadharNumber || studentData.aadhar_number,
      parent_email: studentData.parentEmail || studentData.parent_email,
      blood_group: studentData.bloodGroup || studentData.blood_group,
      blood_group_remarks: studentData.bloodGroupRemarks || studentData.blood_group_remarks,
      country: studentData.country,
      nationality: studentData.nationality,
      admission_mode: studentData.admissionMode || studentData.admission_mode,
      admission_mode_remarks: studentData.admissionModeRemarks || studentData.admission_mode_remarks,
      pwd_category: studentData.pwdCategory || studentData.pwd_category,
      pwd_category_remarks: studentData.pwdCategoryRemarks || studentData.pwd_category_remarks,
      income_group: studentData.incomeGroup || studentData.income_group,
      income: studentData.income,
      alternateEmail: studentData.alternateEmail || studentData.personal_email,
    };

    // Remove undefined fields
    Object.keys(mappedStudent).forEach((key) => {
      if (
        mappedStudent[key] === undefined ||
        mappedStudent[key] === null ||
        mappedStudent[key] === ""
      ) {
        delete mappedStudent[key];
      }
    });

    // Validate required fields
    const requiredFields = [
      "name",
      "father_name",
      "mother_name",
      "jee_app_no",
      "branch",
      "gender",
      "category",
      "pwd",
      "address",
    ];
    const missingFields = requiredFields.filter(
      (field) => !mappedStudent[field],
    );

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    const payload = {
      ...mappedStudent,
      programme_type: programmeType || "ug",
    };

    const response = await axios.post(
      `${BASE_URL}/programme_curriculum/api/admin_add_single_student/`,
      payload,
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Check Duplicate Students
export const checkDuplicateStudents = async (studentsData) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.post(
      `${BASE_URL}/programme_curriculum/api/check_duplicates/`,
      {
        students: studentsData,
      },
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Export Student Data - GET /programme_curriculum/api/export-students/{programme_type}/
export const exportStudentData = async (programmeType) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/export_students/${programmeType}/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
        responseType: "blob",
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update Student Status - POST /programme_curriculum/api/admin_update_student_status/
export const updateStudentStatus = async (statusData) => {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Authorization token is required");
    }

    const response = await axios.post(
      `${BASE_URL}/programme_curriculum/api/admin_update_student_status/`,
      statusData,
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

// Create Batch
export const createBatch = async (batchData) => {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Authorization token is required");
    }

    const payload = {
      programme: batchData.programme || batchData.program,
      discipline: batchData.discipline,
      year: parseInt(batchData.year, 10),
      total_seats: parseInt(batchData.total_seats || batchData.totalSeats, 10),
      curriculum: batchData.curriculum,
      specialization: batchData.specialization,
    };

    // Validate required fields
    if (
      !payload.programme ||
      !payload.discipline ||
      !payload.year ||
      !payload.total_seats
    ) {
      throw new Error(
        "Missing required fields: programme, discipline, year, total_seats",
      );
    }

    const response = await axios.post(
      `${BASE_URL}/programme_curriculum/api/admin_add_batch/`,
      payload,
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update Batch - PUT /programme_curriculum/api/batches/<batch_id>/update/
export const updateBatch = async (batchId, batchData) => {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Authorization token is required");
    }

    const response = await axios.put(
      `${BASE_URL}/programme_curriculum/api/batches/${batchId}/update/`,
      batchData,
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete Batch
export const deleteBatch = async (batchId) => {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Authorization token is required");
    }

    const response = await axios.delete(
      `${BASE_URL}/programme_curriculum/api/batches/${batchId}/delete/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      const errorData = error.response.data;
      error.message =
        errorData?.message ||
        errorData?.error ||
        "Cannot delete batch - it may have associated students or dependencies";
    }
    throw error;
  }
};

// Set Total Seats - PUT /programme_curriculum/api/set-total-seats/
export const setTotalSeats = async (programmeType, totalSeats) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.put(
      `${BASE_URL}/programme_curriculum/api/set_total_seats/`,
      {
        programme_type: programmeType,
        total_seats: totalSeats,
      },
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update Student - PUT /programme_curriculum/api/student/<student_id>/update/
export const updateStudent = async (studentId, studentData) => {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Authorization token is required");
    }

    const response = await axios.put(
      `${BASE_URL}/programme_curriculum/api/student/${studentId}/update/`,
      studentData,
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete Student - DELETE /programme_curriculum/api/student/<int:student_id>/delete/
export const deleteStudent = async (studentId) => {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Authorization token is required");
    }

    const url = `${BASE_URL}/programme_curriculum/api/student/${studentId}/delete/`;

    const response = await axios.delete(url, {
      headers: {
        Authorization: `Token ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    throw error;
  }
};

// Send Student Password - POST /programme_curriculum/api/admin_send_student_password/
export const sendStudentPassword = async (studentId, emailTemplate = null) => {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Authorization token is required");
    }

    const payload = { student_id: studentId };
    if (emailTemplate) payload.email_template = emailTemplate;

    const response = await axios.post(
      `${BASE_URL}/programme_curriculum/api/admin_send_student_password/`,
      payload,
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Send Bulk Student Passwords
export const sendBulkStudentPasswords = async (studentIds) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.post(
      `${BASE_URL}/programme_curriculum/api/send_bulk_student_passwords/`,
      {
        student_ids: studentIds,
      },
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get Password Email History
export const getPasswordEmailHistory = async (studentId) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/password_email_history/${studentId}/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get Bulk Operation Status
export const getBulkOperationStatus = async (operationId) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await axios.get(
      `${BASE_URL}/programme_curriculum/api/bulk_operation_status/${operationId}/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// =============================================================================
// CORRECTED API FUNCTIONS BASED ON ACTUAL BACKEND ENDPOINTS
// =============================================================================

/**
 * Process Excel Upload
 * POST /programme_curriculum/api/admin_process_excel_upload/
 */
export const adminProcessExcelUpload = async (formData) => {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Authorization token is required");
    }

    const response = await axios.post(
      `${BASE_URL}/programme_curriculum/api/admin_process_excel_upload/`,
      formData,
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Save Students Batch
 * POST /programme_curriculum/api/admin_save_students_batch/
 */
export const adminSaveStudentsBatch = async (batchData) => {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Authorization token is required");
    }

    const response = await axios.post(
      `${BASE_URL}/programme_curriculum/api/admin_save_students_batch/`,
      batchData,
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
