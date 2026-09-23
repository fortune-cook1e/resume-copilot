import { useQueryClient } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { QueryProvider } from '@/components/query-provider';

function CacheProbe({ label }: { label: string }) {
  const client = useQueryClient();
  const [value, setValue] = useState('unread');

  return (
    <>
      <button type="button" onClick={() => client.setQueryData(['probe'], 'retained')}>
        Write {label}
      </button>
      <button
        type="button"
        onClick={() => setValue(client.getQueryData<string>(['probe']) ?? 'empty')}
      >
        Read {label}
      </button>
      <output aria-label={label}>{value}</output>
    </>
  );
}

afterEach(cleanup);

describe('query provider', () => {
  it('provides a query client and preserves its cache across rerenders', () => {
    const view = render(
      <QueryProvider>
        <CacheProbe label="cache" />
      </QueryProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Write cache' }));

    view.rerender(
      <QueryProvider>
        <CacheProbe label="cache" />
      </QueryProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Read cache' }));

    expect(screen.getByLabelText('cache').textContent).toBe('retained');
  });

  it('does not share cache between independent provider instances', () => {
    render(
      <>
        <QueryProvider>
          <CacheProbe label="first" />
        </QueryProvider>
        <QueryProvider>
          <CacheProbe label="second" />
        </QueryProvider>
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Write first' }));
    fireEvent.click(screen.getByRole('button', { name: 'Read first' }));
    fireEvent.click(screen.getByRole('button', { name: 'Read second' }));

    expect(screen.getByLabelText('first').textContent).toBe('retained');
    expect(screen.getByLabelText('second').textContent).toBe('empty');
  });
});
