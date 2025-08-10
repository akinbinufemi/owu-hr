import React from 'react';

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
  }[];
}

interface SimpleChartProps {
  data: ChartData;
  type?: 'bar' | 'doughnut';
  title?: string;
}

const SimpleChart: React.FC<SimpleChartProps> = ({ data, type = 'bar', title }) => {
  const maxValue = Math.max(...data.datasets[0].data);
  
  if (type === 'doughnut') {
    const total = data.datasets[0].data.reduce((sum, value) => sum + value, 0);
    const radius = 80;
    const centerX = 100;
    const centerY = 100;
    let currentAngle = -90; // Start from top

    const slices = data.labels.map((label, index) => {
      const value = data.datasets[0].data[index];
      const percentage = (value / total) * 100;
      const angle = (value / total) * 360;
      
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      const startX = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
      const startY = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
      const endX = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
      const endY = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${startX} ${startY}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
        'Z'
      ].join(' ');
      
      currentAngle += angle;
      
      return {
        path: pathData,
        color: data.datasets[0].backgroundColor[index] || '#0ea5e9',
        label,
        value,
        percentage: percentage.toFixed(1)
      };
    });

    return (
      <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
        {title && (
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', textAlign: 'center' }}>
            {title}
          </h3>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <svg width="200" height="200" viewBox="0 0 200 200">
            {slices.map((slice, index) => (
              <path
                key={index}
                d={slice.path}
                fill={slice.color}
                stroke="white"
                strokeWidth="2"
              />
            ))}
          </svg>
          <div style={{ flex: 1 }}>
            {slices.map((slice, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: slice.color,
                    borderRadius: '2px',
                    marginRight: '0.5rem'
                  }}
                />
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                  {slice.label}: {slice.value} ({slice.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Bar chart
  return (
    <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
      {title && (
        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', textAlign: 'center' }}>
          {title}
        </h3>
      )}
      <div style={{ display: 'flex', alignItems: 'end', height: '200px', gap: '0.5rem', padding: '1rem 0' }}>
        {data.labels.map((label, index) => {
          const value = data.datasets[0].data[index];
          const height = (value / maxValue) * 160; // Max height 160px
          const color = data.datasets[0].backgroundColor[index] || '#0ea5e9';
          
          return (
            <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  backgroundColor: color,
                  height: `${height}px`,
                  width: '100%',
                  borderRadius: '4px 4px 0 0',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'end',
                  justifyContent: 'center',
                  paddingBottom: '0.25rem',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}
              >
                {value}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center', wordBreak: 'break-word' }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SimpleChart;