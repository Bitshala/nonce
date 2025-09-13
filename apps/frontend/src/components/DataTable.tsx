import React, { useState } from 'react';

// Generic data type for table rows
interface TableRow {
  [key: string]: any;
}

// Column configuration type
interface Column<T = TableRow> {
  key: keyof T | string;
  label: string;
  type?: 'date' | 'truncate' | 'number' | 'string';
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
  expandable?: boolean;
  className?: string;
  expandableClassName?: string;
}

// Sort order type
type SortOrder = 'asc' | 'desc';

// Main component props
interface DataTableProps<T = TableRow> {
  data?: T[];
  columns?: Column<T>[];
  title?: string;
  loading?: boolean;
  error?: string | Error | null;
  searchable?: boolean;
  sortable?: boolean;
  expandable?: boolean;
  pageSize?: number;
  className?: string;
}

const DataTable = <T extends TableRow = TableRow>({ 
  data = [], 
  columns = [], 
  title = "Data Table",
  loading = false,
  error = null,
  searchable = true,
  sortable = true,
  expandable = true,
  pageSize = 10,
  className = ""
}: DataTableProps<T>) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<string>(columns[0]?.key?.toString() || '');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Helper function to get nested values from objects with type safety
  const getNestedValue = (obj: unknown, path: string): any => {
    if (!obj || typeof obj !== 'object') return undefined;
    return path.split('.').reduce((current: any, key: string) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  };

  // Filter data based on search term with type safety
  const filteredData: T[] = data.filter((item: T) =>
    columns.some((column: Column<T>) => {
      const value = getNestedValue(item, column.key.toString());
      return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    })
  );

  // Sort filtered data with proper type handling
  const sortedData: T[] = sortable ? [...filteredData].sort((a: T, b: T) => {
    const aValue = getNestedValue(a, sortField) || '';
    const bValue = getNestedValue(b, sortField) || '';
    
    // Handle different data types
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    const aString = String(aValue);
    const bString = String(bValue);
    const comparison = aString.localeCompare(bString);
    return sortOrder === 'asc' ? comparison : -comparison;
  }) : filteredData;

  // Paginate data with proper typing
  const totalPages: number = Math.ceil(sortedData.length / pageSize);
  const startIndex: number = (currentPage - 1) * pageSize;
  const paginatedData: T[] = sortedData.slice(startIndex, startIndex + pageSize);

  const toggleRowExpansion = (index: number): void => {
    const globalIndex = startIndex + index;
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(globalIndex)) {
      newExpandedRows.delete(globalIndex);
    } else {
      newExpandedRows.add(globalIndex);
    }
    setExpandedRows(newExpandedRows);
  };

  const handleSort = (field: string): void => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const formatDate = (timestamp: unknown): string => {
    if (!timestamp) return '-';
    
    try {
      const date = new Date(timestamp as string | number);
      if (isNaN(date.getTime())) return '-';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const renderCellContent = (item: T, column: Column<T>): React.ReactNode => {
    const value = getNestedValue(item, column.key.toString());
    
    if (column.render) {
      return column.render(value, item);
    }
    
    if (column.type === 'date') {
      return formatDate(value);
    }
    
    if (column.type === 'truncate') {
      return (
        <span className="max-w-xs truncate block" title={String(value || '')}>
          {value || '-'}
        </span>
      );
    }
    
    return value?.toString() || '-';
  };

  // Get columns for table display (non-expandable columns)
  const displayColumns: Column<T>[] = columns.filter((col: Column<T>) => !col.expandable);
  
  // Get columns for expanded view
  const expandableColumns: Column<T>[] = columns.filter((col: Column<T>) => col.expandable);

  // Handle error display
  const getErrorMessage = (error: string | Error | null): string => {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return 'An unknown error occurred';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-zinc-400 text-lg">Loading awesome data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-900 flex justify-center items-center">
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-6 py-4 rounded-lg max-w-md">
          <h3 className="font-semibold mb-2">Error Loading Data</h3>
          <p>{getErrorMessage(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-zinc-900 ${className}`} style={{ overflowX: 'auto' }}>
      <div className="container mx-auto px-4 py-8" style={{ minWidth: '1200px' }}>
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">{title}</h1>
          <p className="text-zinc-400 text-lg">Feedback for this cohort</p>
          <div className="text-orange-400 font-mono text-xl mt-2">
            Total records: {sortedData.length}
          </div>
        </div>

        {/* Search and Controls */}
        {(searchable || sortable) && (
          <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
            {searchable && (
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-400 rounded-lg px-4 py-3 pl-12 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            )}
            
            {sortable && (
              <div className="flex gap-3">
                <select
                  value={sortField}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortField(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                >
                  {columns.filter((col: Column<T>) => col.sortable !== false).map((col: Column<T>) => (
                    <option key={col.key.toString()} value={col.key.toString()} className="bg-zinc-800">
                      Sort by {col.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg px-4 py-3 transition-all duration-200 hover:border-orange-500"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modern Table */}
        <div className="bg-zinc-800 rounded-2xl overflow-hidden shadow-2xl border border-zinc-700">
          <div className="overflow-x-auto" style={{ scrollbarColor: '#fb923c #52525b', scrollbarWidth: 'thin' }}>
            <div className="min-w-full">
              <table className="w-full">
              <thead>
                <tr className="bg-zinc-750">
                  {expandable && expandableColumns.length > 0 && (
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-700">
                      Actions
                    </th>
                  )}
                  {displayColumns.map((column: Column<T>) => (
                    <th
                      key={column.key.toString()}
                      className={`px-6 py-4 text-left text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-700 ${
                        sortable && column.sortable !== false ? 'cursor-pointer hover:bg-zinc-700 transition-colors' : ''
                      }`}
                      onClick={() => sortable && column.sortable !== false && handleSort(column.key.toString())}
                    >
                      <div className="flex items-center gap-2">
                        {column.label}
                        {sortable && sortField === column.key.toString() && (
                          <span className="text-orange-400 text-lg">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {paginatedData.map((item: T, index: number) => {
                  const globalIndex: number = startIndex + index;
                  const isEven: boolean = index % 2 === 0;
                  return (
                    <React.Fragment key={globalIndex}>
                      {/* Main Row */}
                      <tr className={`${isEven ? 'bg-zinc-800' : 'bg-zinc-750'} hover:bg-zinc-700 transition-colors duration-200`}>
                        {expandable && expandableColumns.length > 0 && (
                          <td className="px-6 py-4">
                            <button
                              onClick={() => toggleRowExpansion(index)}
                              className="b-0 bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                            >
                              {expandedRows.has(globalIndex) ? 'Hide' : 'Info'}
                            </button>
                          </td>
                        )}
                        {displayColumns.map((column: Column<T>) => (
                          <td
                            key={column.key.toString()}
                            className={`px-6 py-4 text-sm text-zinc-300 ${
                              column.className || ''
                            } ${column.type === 'truncate' ? '' : 'whitespace-nowrap'}`}
                          >
                            {renderCellContent(item, column)}
                          </td>
                        ))}
                      </tr>

                      {/* Expanded Details Row */}
                      {expandable && expandedRows.has(globalIndex) && expandableColumns.length > 0 && (
                        <tr className="bg-zinc-900">
                          <td colSpan={displayColumns.length + 1} className="px-6 py-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {expandableColumns.map((column: Column<T>) => (
                                <DetailCard
                                  key={column.key.toString()}
                                  title={column.label}
                                  content={renderCellContent(item, column)}
                                  className={column.expandableClassName}
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {paginatedData.length === 0 && (
              <div className="text-center py-16">
                <div className="text-zinc-500 text-xl mb-4">🔍</div>
                <div className="text-zinc-400 text-lg">No records found</div>
                <p className="text-zinc-500 mt-2">Try adjusting your search criteria</p>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Modern Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-zinc-400 text-sm">
              Showing <span className="font-semibold text-white">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-white">{Math.min(startIndex + pageSize, sortedData.length)}</span> of{' '}
              <span className="font-semibold text-orange-400">{sortedData.length}</span> results
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-white px-4 py-2 rounded-lg transition-all duration-200 disabled:cursor-not-allowed border border-zinc-700"
              >
                Previous
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i: number) => {
                  let page: number;
                  if (totalPages <= 7) {
                    page = i + 1;
                  } else if (currentPage <= 4) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    page = totalPages - 6 + i;
                  } else {
                    page = currentPage - 3 + i;
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg font-medium text-sm transition-all duration-200 ${
                        currentPage === page
                          ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-white px-4 py-2 rounded-lg transition-all duration-200 disabled:cursor-not-allowed border border-zinc-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Detail Card Component with proper typing
interface DetailCardProps {
  title: string;
  content: React.ReactNode;
  className?: string;
}

const DetailCard: React.FC<DetailCardProps> = ({ title, content, className = "" }) => (
  <div className={`bg-zinc-800 border border-zinc-700 p-6 rounded-xl hover:border-orange-500/30 transition-all duration-200 ${className}`}>
    <h4 className="font-bold text-orange-400 mb-3 text-sm uppercase tracking-wider">
      {title}
    </h4>
    <div className="text-zinc-300 text-sm leading-relaxed">
      {content || <span className="text-zinc-500 italic">No response provided</span>}
    </div>
  </div>
);

export default DataTable;