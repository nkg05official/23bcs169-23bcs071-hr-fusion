import { Container, Text } from "@mantine/core";
import notfound from "../assets/notfound.svg";

export function Empty() {
  return (
    <Container style={{ textAlign: "center", padding: "40px 20px" }}>
      <img src={notfound} height={200} alt="404" />
      <Text size="xl" weight={500} mt="lg" mb="sm">
        No new notifications found!
      </Text>
      <Text size="md" c="dimmed" mb="lg">
        There is no new notification available. Please check back later.
      </Text>
      {/* <a href="/">
        <Button variant="filled">
          Go to home
        </Button>
      </a> */}
    </Container>
  );
}
