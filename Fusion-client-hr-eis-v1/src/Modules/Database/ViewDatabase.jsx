import { Container, Title, Text, Paper } from "@mantine/core";

export default function ViewDatabase() {
  return (
    <Container size="xl" py="xl">
      <Paper shadow="sm" p="xl" radius="md">
        <Title order={2} mb="lg">
          View Database
        </Title>
        <Text size="md" c="dimmed">
          Database viewing interface will be implemented here.
        </Text>
      </Paper>
    </Container>
  );
}
