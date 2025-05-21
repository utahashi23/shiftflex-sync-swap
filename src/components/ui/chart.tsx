
import React from 'react';
import {
  Bar,
  BarChart as RechartsBarChart,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';

// Default colors for charts
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
  '#a855f7', '#ec4899', '#8b5cf6', '#06b6d4',
  '#84cc16', '#22c55e', '#14b8a6', '#f97316'
];

type ChartProps = {
  data: any[];
  className?: string;
  valueFormatter?: (value: number) => string;
}

interface BarChartProps extends ChartProps {
  categories: string[];
  index: string;
  showLegend?: boolean;
}

export const BarChart = ({
  data,
  categories,
  index,
  className,
  valueFormatter = (value: number) => `${value}`,
  showLegend = true,
}: BarChartProps) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-40 bg-gray-50 rounded-md">No data available</div>;
  }
  
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsBarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey={index} 
          tick={{ fontSize: 12 }} 
          tickFormatter={(value) => {
            // Format date strings to shorter version
            if (value.includes('-')) {
              return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }
            return value;
          }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip 
          formatter={(value: number) => [valueFormatter(value)]} 
          labelFormatter={(value) => {
            if (typeof value === 'string' && value.includes('-')) {
              return new Date(value).toLocaleDateString();
            }
            return value;
          }}
        />
        {showLegend && <Legend />}
        {categories.map((category, index) => (
          <Bar 
            key={category} 
            dataKey={category} 
            fill={COLORS[index % COLORS.length]} 
            radius={[4, 4, 0, 0]} 
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

interface LineChartProps extends ChartProps {
  categories: string[];
  index: string;
  showLegend?: boolean;
}

export const LineChart = ({
  data,
  categories,
  index,
  className,
  valueFormatter = (value: number) => `${value}`,
  showLegend = true,
}: LineChartProps) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-40 bg-gray-50 rounded-md">No data available</div>;
  }
  
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsLineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey={index} 
          tick={{ fontSize: 12 }} 
          tickFormatter={(value) => {
            // Format date strings to shorter version
            if (value.includes('-')) {
              return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }
            return value;
          }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip 
          formatter={(value: number) => [valueFormatter(value)]} 
          labelFormatter={(value) => {
            if (typeof value === 'string' && value.includes('-')) {
              return new Date(value).toLocaleDateString();
            }
            return value;
          }}
        />
        {showLegend && <Legend />}
        {categories.map((category, index) => (
          <Line 
            key={category} 
            type="monotone" 
            dataKey={category} 
            stroke={COLORS[index % COLORS.length]} 
            activeDot={{ r: 8 }} 
            strokeWidth={2}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

interface PieChartProps extends ChartProps {
  nameKey?: string;
  dataKey?: string;
}

export const PieChart = ({
  data,
  className,
  valueFormatter = (value: number) => `${value}`,
  nameKey = "name",
  dataKey = "value",
}: PieChartProps) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-40 bg-gray-50 rounded-md">No data available</div>;
  }
  
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsPieChart margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius="80%"
          dataKey={dataKey}
          nameKey={nameKey}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [valueFormatter(value)]} />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};
