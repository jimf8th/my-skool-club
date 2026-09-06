import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import About from './About';

describe('About', () => {
  it('identifies the creator and provides contact and contribution links', () => {
    render(<MemoryRouter><About /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Jim Edward' })).toBeInTheDocument();
    expect(screen.getByText('High School Student · Arizona')).toBeInTheDocument();
    expect(screen.queryByAltText('Illustrated portrait of Jim Edward')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'jim.edward@myskoolclub.com' })).toHaveAttribute(
      'href', 'mailto:jim.edward@myskoolclub.com'
    );
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href', 'https://www.linkedin.com/in/jim-faith-edward-5b15a242a/'
    );
    expect(screen.getByRole('link', { name: 'View on GitHub' })).toHaveAttribute(
      'href', 'https://github.com/jimf8th/my-skool-club'
    );
    expect(screen.getByText('Contributions are welcome.')).toBeInTheDocument();
  });
});
