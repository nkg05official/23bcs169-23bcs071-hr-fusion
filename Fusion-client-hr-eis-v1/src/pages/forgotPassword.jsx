import {
  Button,
  Center,
  Container,
  Divider,
  Paper,
  Text,
  TextInput,
  Title,
} from "@mantine/core";

function ForgotPassword() {
  return (
    <Center w="100%">
      <Container w={420} my={100}>
        <Title ta="center">Reset Password</Title>

        <Paper
          withBorder
          shadow="lg"
          p={30}
          mt={40}
          radius="md"
          style={{ border: "2px solid #15ABFF" }}
        >
          <Text size="sm">
            Forgotten your password? Enter your e-mail address below, and we
            will send you an e-mail allowing you to reset it.
          </Text>
          <Divider my="md" />
          <TextInput
            label="Username/Email"
            type="email"
            placeholder="username or email"
            required
          />
          <Button fullWidth mt="xl" bg="#15ABFF">
            Reset Password
          </Button>
          <Divider my="md" />
          <Text size="sm">
            Please contact CC admin if you have any trouble resetting your
            password.
          </Text>
        </Paper>
      </Container>
    </Center>
  );
}

export default ForgotPassword;
