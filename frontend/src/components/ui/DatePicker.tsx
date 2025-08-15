import React, { useState, useRef, useEffect } from 'react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  name?: string;
  minDate?: string; // YYYY-MM-DD format
  maxDate?: string; // YYYY-MM-DD format
  type?: 'default' | 'birthdate' | 'future' | 'past';
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date",
  required = false,
  className = "",
  name,
  minDate,
  maxDate,
  type = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );
  const [currentMonth, setCurrentMonth] = useState(
    selectedDate ? selectedDate.getMonth() : new Date().getMonth()
  );
  const [currentYear, setCurrentYear] = useState(
    selectedDate ? selectedDate.getFullYear() : new Date().getFullYear()
  );
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calculate date constraints based on type
  const getDateConstraints = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    switch (type) {
      case 'birthdate':
        return {
          minDate: new Date(1900, 0, 1), // January 1, 1900
          maxDate: today // Today (no future dates)
        };
      case 'future':
        return {
          minDate: today, // Today onwards
          maxDate: new Date(currentYear + 10, 11, 31) // 10 years from now
        };
      case 'past':
        return {
          minDate: new Date(currentYear - 10, 0, 1), // 10 years ago
          maxDate: today // Today (no future dates)
        };
      default:
        return {
          minDate: minDate ? new Date(minDate) : new Date(currentYear - 10, 0, 1),
          maxDate: maxDate ? new Date(maxDate) : new Date(currentYear + 10, 11, 31)
        };
    }
  };

  const constraints = getDateConstraints();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDateDisabled = (date: Date) => {
    return date < constraints.minDate || date > constraints.maxDate;
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    if (isDateDisabled(newDate)) return;
    
    setSelectedDate(newDate);
    onChange(newDate.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const generateYearOptions = () => {
    const minYear = constraints.minDate.getFullYear();
    const maxYear = constraints.maxDate.getFullYear();
    const years = [];
    for (let year = minYear; year <= maxYear; year++) {
      years.push(year);
    }
    return years.reverse(); // Most recent years first
  };

  const canNavigateToMonth = (month: number, year: number) => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    return !(lastDayOfMonth < constraints.minDate || firstDayOfMonth > constraints.maxDate);
  };

  const navigateToPreviousMonth = () => {
    const newMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const newYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    if (canNavigateToMonth(newMonth, newYear)) {
      setCurrentMonth(newMonth);
      setCurrentYear(newYear);
    }
  };

  const navigateToNextMonth = () => {
    const newMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const newYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    
    if (canNavigateToMonth(newMonth, newYear)) {
      setCurrentMonth(newMonth);
      setCurrentYear(newYear);
    }
  };

  return (
    <div className={`relative max-w-sm ${className}`} ref={dropdownRef}>
      {/* Flowbite-style input with calendar icon */}
      <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
        <svg 
          className="w-4 h-4 text-gray-500 dark:text-gray-400" 
          aria-hidden="true" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z"/>
        </svg>
      </div>
      <input
        name={name}
        type="text"
        value={formatDisplayDate(selectedDate)}
        onClick={() => setIsOpen(!isOpen)}
        placeholder={placeholder}
        required={required}
        readOnly
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 cursor-pointer"
      />
      
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg w-80 p-4">
          {/* Header with month/year selectors */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={navigateToPreviousMonth}
              className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-1">
              <select
                value={currentMonth}
                onChange={(e) => {
                  const newMonth = parseInt(e.target.value);
                  if (canNavigateToMonth(newMonth, currentYear)) {
                    setCurrentMonth(newMonth);
                  }
                }}
                className="text-sm font-semibold text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0"
              >
                {months.map((month, index) => (
                  <option 
                    key={index} 
                    value={index}
                    disabled={!canNavigateToMonth(index, currentYear)}
                  >
                    {month}
                  </option>
                ))}
              </select>
              
              <select
                value={currentYear}
                onChange={(e) => {
                  const newYear = parseInt(e.target.value);
                  setCurrentYear(newYear);
                  if (!canNavigateToMonth(currentMonth, newYear)) {
                    // Find a valid month for this year
                    for (let month = 0; month < 12; month++) {
                      if (canNavigateToMonth(month, newYear)) {
                        setCurrentMonth(month);
                        break;
                      }
                    }
                  }
                }}
                className="text-sm font-semibold text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0"
              >
                {generateYearOptions().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              type="button"
              onClick={navigateToNextMonth}
              className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          {/* Calendar grid */}
          <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div key={day} className="h-6 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: firstDayOfMonth }, (_, i) => (
                <div key={`empty-${i}`} className="h-8"></div>
              ))}
              
              {/* Days of the month */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const date = new Date(currentYear, currentMonth, day);
                const isSelected = selectedDate && 
                  selectedDate.getDate() === day &&
                  selectedDate.getMonth() === currentMonth &&
                  selectedDate.getFullYear() === currentYear;
                const isDisabled = isDateDisabled(date);
                const isToday = new Date().toDateString() === date.toDateString();
                
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    disabled={isDisabled}
                    className={`h-8 w-8 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isSelected
                        ? 'bg-blue-700 text-white hover:bg-blue-800'
                        : isToday
                        ? 'bg-blue-700 text-white hover:bg-blue-800'
                        : isDisabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                if (!isDateDisabled(today)) {
                  setSelectedDate(today);
                  setCurrentMonth(today.getMonth());
                  setCurrentYear(today.getFullYear());
                  onChange(today.toISOString().split('T')[0]);
                  setIsOpen(false);
                }
              }}
              className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none font-medium"
            >
              Today
            </button>
            
            <button
              type="button"
              onClick={() => {
                setSelectedDate(null);
                onChange('');
                setIsOpen(false);
              }}
              className="text-sm text-gray-600 hover:text-gray-800 focus:outline-none font-medium"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;