import React, { useEffect, useRef } from 'react';
import { Datepicker } from 'flowbite-datepicker';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const datepickerRef = useRef<Datepicker | null>(null);

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

  useEffect(() => {
    if (inputRef.current && !datepickerRef.current) {
      const constraints = getDateConstraints();
      
      datepickerRef.current = new Datepicker(inputRef.current, {
        autohide: true,
        format: 'mm/dd/yyyy',
        todayBtn: true,
        clearBtn: true,
        todayBtnMode: 1,
        minDate: constraints.minDate,
        maxDate: constraints.maxDate,
        weekStart: 0, // Sunday
        daysOfWeekDisabled: [],
        daysOfWeekHighlighted: [],
        defaultViewDate: value ? new Date(value) : new Date(),
        title: placeholder,
        showOnFocus: true,
        showOnClick: true,
        orientation: 'auto',
        container: 'body'
      });

      // Set initial value if provided
      if (value) {
        const date = new Date(value);
        datepickerRef.current.setDate(date);
      }

      // Listen for date changes
      inputRef.current.addEventListener('changeDate', (e: any) => {
        const selectedDate = e.detail.date;
        if (selectedDate) {
          const formattedDate = selectedDate.toISOString().split('T')[0];
          onChange(formattedDate);
        } else {
          onChange('');
        }
      });
    }

    return () => {
      if (datepickerRef.current) {
        datepickerRef.current.destroy();
        datepickerRef.current = null;
      }
    };
  }, []);

  // Update datepicker when value changes externally
  useEffect(() => {
    if (datepickerRef.current && value) {
      const date = new Date(value);
      datepickerRef.current.setDate(date);
    } else if (datepickerRef.current && !value) {
      datepickerRef.current.setDate({ clear: true });
    }
  }, [value]);

  const formatDisplayValue = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className={`relative max-w-sm ${className}`}>
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
        ref={inputRef}
        name={name}
        type="text"
        value={formatDisplayValue(value)}
        placeholder={placeholder}
        required={required}
        readOnly
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 cursor-pointer"
      />
    </div>
  );
};

export default DatePicker;