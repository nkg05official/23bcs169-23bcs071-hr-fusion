import React from 'react';
import { Box, Text, Button, Container, Title } from '@mantine/core';
import { WarningCircle } from '@phosphor-icons/react';

/**
 * Error Boundary Component
 * Catches React component rendering errors and displays fallback UI
 * Fixes: Issue #12 (Frontend: Add error boundaries)
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Send to error tracking service (e.g., Sentry)
    if (window.logErrorToServer) {
      window.logErrorToServer({
        error: error.toString(),
        errorInfo: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container size="md" py="xl">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px',
              gap: '20px',
            }}
          >
            <WarningCircle size={64} color="red" weight="fill" />
            <Title order={2}>Something went wrong</Title>
            <Text color="dimmed" align="center">
              An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
            </Text>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box
                sx={{
                  backgroundColor: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px',
                  width: '100%',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}
              >
                <Text weight={600} color="red">
                  {this.state.error.toString()}
                </Text>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: '12px' }}>
              <Button onClick={this.handleReset} variant="filled">
                Try Again
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
                variant="light"
              >
                Go to Dashboard
              </Button>
            </Box>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
