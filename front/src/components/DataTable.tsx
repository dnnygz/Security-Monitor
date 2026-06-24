type DataTableProps<T> = {
  columns: Array<{
    key: string;
    header: string;
    render: (row: T) => React.ReactNode;
  }>;
  rows: T[];
};

export function DataTable<T>({ columns, rows }: DataTableProps<T>) {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String((row as { id?: unknown }).id || index)}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
