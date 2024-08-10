// ThemeSelector.spec.tsx
import 'test/matchMedia.mock';

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { ThemeSelector } from './General';
import { RecoilRoot } from 'recoil';

describe('ThemeSelector', () => {
  let mockOnChange;

  beforeEach(() => {
    mockOnChange = jest.fn();
  });

  it('renders correctly', () => {
    global.ResizeObserver = class MockedResizeObserver {
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    };
    const { getByText } = render(
      <RecoilRoot>
        <ThemeSelector theme="system" onChange={mockOnChange} />
      </RecoilRoot>,
    );

    expect(getByText('Theme')).toBeInTheDocument();
    expect(getByText('System')).toBeInTheDocument();
  });

  it('calls onChange when the select value changes', async () => {
    global.ResizeObserver = class MockedResizeObserver {
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    };
    const { getByText, getByTestId } = render(
      <RecoilRoot>
        <ThemeSelector theme="system" onChange={mockOnChange} />
      </RecoilRoot>,
    );

    expect(getByText('Theme')).toBeInTheDocument();

    // Find the dropdown button by data-testid
    const dropdownButton = getByTestId('theme-selector');

    // Open the dropdown
    fireEvent.click(dropdownButton);

    // Find the option by text and click it
    const darkOption = getByText('Dark');
    fireEvent.click(darkOption);

    // Ensure that the onChange is called with the expected value
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('dark');
    });
  });
});
