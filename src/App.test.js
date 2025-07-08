import { render, screen } from '@testing-library/react';
import App from './App';

test('renders name prompt when no username is entered', () => {
  render(<App />);
  const promptElement = screen.getByText(/enter your name/i);
  expect(promptElement).toBeInTheDocument();
});
