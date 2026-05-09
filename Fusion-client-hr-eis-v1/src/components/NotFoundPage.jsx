import React from 'react';
import { Center, Stack, Title, Text, Button } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Center style={{ minHeight: '80vh', padding: '2rem' }}>
      <Stack align="center" spacing="xl">
        <IconSearch size={160} color="gray" />

        <Title
          order={1}
          sx={(theme) => ({
            fontSize: 34,
            fontWeight: 900,
            [theme.fn.smallerThan('sm')]: { fontSize: 24 },
          })}
        >
          404 — Page Not Found
        </Title>

        <Text
          size="lg"
          align="center"
          style={{ maxWidth: 500 }}
        >
          we couldn't find the page you're looking for. It may have been moved or deleted.
        </Text>

        <Button size="md" onClick={() => navigate('/dashboard', { replace: true })}>
          Go Back Home
        </Button>
      </Stack>
    </Center>
  );
}
