import { useState } from "react";
import { Table, Button, ScrollArea, Group } from "@mantine/core";
import { IconEye, IconDownload } from "@tabler/icons-react";
import axios from "axios";
import { generate_transcript, download_grades } from "../routes/examinationRoutes";
import { useSelector } from "react-redux";
import "../styles/transcript.css";
import StudentTranscript from "./studentTranscript";

function Transcript({ data, semester }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [downloading, setDownloading] = useState({});
  const students = data?.students || [];
  const userRole = useSelector((state) => state.user.role);

  const handlePreview = (student) => {
    setSelectedStudent(student); // Set the student to show transcript
  };

  const handleBack = () => {
    setSelectedStudent(null); // Go back to list view
  };

  const handleDownload = async (student) => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.error("No authentication token found!");
      return;
    }

    try {
      setDownloading(prev => ({ ...prev, [student.id_id]: true }));
      const transcriptResponse = await axios.post(
        generate_transcript,
        {
          Role: userRole,
          student: student.id_id,
          semester: JSON.stringify(semester),
        },
        { headers: { Authorization: `Token ${token}` } }
      );

      const transcriptData = transcriptResponse.data;
      
      if (!transcriptData) {
        console.error("No transcript data received");
        return;
      }
      const processedCourses = transcriptData.courses_grades ? 
        Object.values(transcriptData.courses_grades).map(course => ({
          course_id: {
            course_code: course.course_code,
            course_name: course.course_name,
            credits: course.credit || 0
          },
          coursecode: course.course_code,
          coursename: course.course_name,
          credits: course.credit || 0,
          grade: course.grade,
          grade_points: course.points || 0,
          points: course.points || 0
        })) : [];
      const userData = JSON.parse(localStorage.getItem('user')) || {};
      const studentInfo = {
        name: transcriptData.student_name || transcriptData.name || student.name || userData.name || userData.username || '',
        rollNumber: transcriptData.roll_number || student.id_id || userData.roll_no || '',
        programme: transcriptData.programme || student.programme || userData.programme || 'N/A',
        branch: transcriptData.department || transcriptData.branch || student.branch || student.department || userData.department || 'N/A',
        academicYear: transcriptData.academic_year || student.academic_year || userData.academic_year || 'N/A'
      };
      const { no: semester_no, type: semester_type } = semester;
      
      const pdfResponse = await axios.post(
        download_grades,
        { 
          semester_no, 
          semester_type,
          student_info: studentInfo,
          courses: processedCourses,
          spi: parseFloat(transcriptData.spi) || 0,
          cpi: parseFloat(transcriptData.cpi) || 0,
          su: parseInt(transcriptData.su, 10) || 0,
          tu: parseInt(transcriptData.tu, 10) || 0
        },
        { 
          headers: { 
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json'
          },
          responseType: 'blob' 
        }
      );

      let semesterLabel;
      if (semester_type && semester_type.toLowerCase().includes('summer')) {
        // Map semester numbers to correct summer labels
        const summerMapping = {
          2: "Summer1",
          4: "Summer2", 
          6: "Summer3",
          8: "Summer4"
        };
        semesterLabel = summerMapping[semester_no] || `Summer${semester_no}`;
      } else {
        semesterLabel = `sem${semester_no}`;
      }

      const fileName = `transcript_${studentInfo.rollNumber}_${semesterLabel}.pdf`;

      const blob = new Blob([pdfResponse.data], { 
        type: 'application/pdf'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.title = `Transcript - ${studentInfo.name} - ${semesterLabel}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setDownloading(prev => ({ ...prev, [student.id_id]: false }));
    }
  };

  return (
    <div className="transcript-container">
      {selectedStudent ? (
        <StudentTranscript student={selectedStudent} semester={semester} onBack={handleBack} />
      ) : (
        <>
          {students.length > 0 ? (
            <Table striped highlightOnHover captionSide="top" mt="md" className="transcript-table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Programme</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id_id} className="table-row">
                    <td className="table-cell">
                      {student.id_id}
                    </td>
                    <td className="table-cell">{student.programme}</td>
                    <td style={{ textAlign: 'center' }}>
                      <Group gap="xs" justify="center">
                        <Button
                          size="xs"
                          color="blue"
                          leftSection={<IconEye size={14} />}
                          onClick={() => handlePreview(student)}
                        >
                          Preview
                        </Button>
                        <Button
                          size="xs"
                          color="green"
                          leftSection={<IconDownload size={14} />}
                          onClick={() => handleDownload(student)}
                          loading={downloading[student.id_id]}
                        >
                          Download
                        </Button>
                      </Group>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="no-data">No transcript records available.</div>
          )}
        </>
      )}
    </div>
  );
}

export default Transcript;
