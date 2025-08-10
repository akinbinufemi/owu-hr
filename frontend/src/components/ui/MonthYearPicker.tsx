import React, { useState, useRef, useEffect } from 'react';

interface MonthYearPickerProps {
  value: string; // Format: "YYYY-MM"
  onChange: (monthYear: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  name?: string;
}

const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  value,
  onChange,
  placeholder = "Select month/year",
  required = false,
  className = "",
  name
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    value ? parseInt(value.split('-')[1]) - 1 : new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    value ? parseInt(value.split('-')[0]) : new Date().getFullYear()
  );
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = () => {
    const monthYear = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    onChange(monthYear);
    setIsOpen(false);
  };

  const formatDisplayValue = () => {
    if (!value) return '';
    const [year, month] = value.split('-');
    const monthIndex = parseInt(month) - 1;
    return `${months[monthIndex]} ${year}`;
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear - 5; year <= currentYear + 10; year++) {
      years.push(year);
    }
    return years;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <input
        type="text"
        name={name}
        value={formatDisplayValue()}
        onClick={() => setIsOpen(!isOpen)}
        placeholder={placeholder}
        required={required}
        readOnly
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer bg-white"
      />
      
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg w-72">
          <div className="p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {generateYearOptions().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month
              </label>
              <div className="grid grid-cols-3 gap-2">
                {months.map((month, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedMonth(index)}
                    className={`px-3 py-2 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selectedMonth === index
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {month.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setSelectedMonth(now.getMonth());
                  setSelectedYear(now.getFullYear());
                }}
                className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
              >
                This Month
              </button>
              
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSelect}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Select
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthYearPicker;