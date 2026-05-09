import { useEffect, useState } from "react";
import { Card, Table, Text, Loader, Center } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import axios from "axios";
import { studentCalenderRoute } from "../../routes/academicRoutes";

function StudentCalendar() {
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCalendar = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("No authentication token found.");
        }

        const response = await axios.get(studentCalenderRoute, {
          headers: {
            Authorization: `Token ${token}`,
          },
        });

        setCalendarEvents(response.data.calendar_events);
      } catch (error) {
        console.error("Error fetching calendar:", error);

        showNotification({
          title: "Error",
          message: "Failed to fetch calendar data. Please try again.",
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCalendar();
  }, []);

  const rows = calendarEvents.map((event, index) => (
    <tr key={index}>
      <td>{event.from_date}</td>
      <td>{event.to_date}</td>
      <td>{event.description}</td>
    </tr>
  ));

  return (
    <Card>
      <Text align="center" size="lg" weight={700} color="blue" mb="md">
        Academic Calendar
      </Text>

      {loading ? (
        <Center>
          <Loader variant="dots" />
        </Center>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </Table>
      )}
    </Card>
  );
}

export default StudentCalendar;
