import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Button } from './components/ui/Button';
import { Badge } from './components/ui/Badge';
import { Input } from './components/ui/Input';
import { Tabs } from './components/ui/Tabs';

describe('Shared UI Components', () => {
  it('renders Button with variants and handles clicks', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} variant="primary">Click Me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('bg-accent');
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders Badge with uppercase text and status variant', () => {
    render(<Badge variant="ok">CONFIRMED</Badge>);
    const badge = screen.getByText('CONFIRMED');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('text-ok');
  });

  it('renders Input with label, hint, and error states', () => {
    const { rerender } = render(<Input label="Item Name" hint="Enter name" />);
    expect(screen.getByText('Item Name')).toBeInTheDocument();
    expect(screen.getByText('Enter name')).toBeInTheDocument();

    rerender(<Input label="Item Name" error="Name is required" />);
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('renders Tabs and fires onChange when clicked', () => {
    const handleChange = vi.fn();
    const tabs = [
      { id: 'tab1', label: 'First' },
      { id: 'tab2', label: 'Second' },
    ];
    render(<Tabs tabs={tabs} activeTab="tab1" onChange={handleChange} />);
    const secondTab = screen.getByRole('button', { name: /second/i });
    fireEvent.click(secondTab);
    expect(handleChange).toHaveBeenCalledWith('tab2');
  });
});
